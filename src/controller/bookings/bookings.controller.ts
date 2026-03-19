import { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const RESCHEDULE_WINDOW_HOURS = 12;

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;

        const bookings = await prisma.bookings.findMany({
            where: { user_id: userId },
            include: {
                court: {
                    include: {
                        venue: {
                            select: {
                                name: true,
                                address: true,
                                contact_number: true
                            }
                        }
                    }
                },
                reschedules: {
                    orderBy: { rescheduled_at: "desc" },
                    take: 1
                }
            },
            orderBy: { date: "desc" }
        });

        const now = new Date();
        const thresholdMs = RESCHEDULE_WINDOW_HOURS * 60 * 60 * 1000;

        const enrichedBookings = bookings.map((booking) => {
            const msUntilStart = booking.start_time.getTime() - now.getTime();
            const isEligible =
                booking.status === "CONFIRMED" && msUntilStart > thresholdMs;

            return {
                ...booking,
                is_reschedule_eligible: isEligible,
                reschedule_ineligible_reason: !isEligible
                    ? booking.status !== "CONFIRMED"
                        ? `Booking is ${booking.status.toLowerCase()} — only confirmed bookings can be rescheduled.`
                        : `Rescheduling is not allowed within ${RESCHEDULE_WINDOW_HOURS} hours of the booking start time.`
                    : null
            };
        });

        res.status(200).json(enrichedBookings);
    } catch (error) {
        console.error("[getMyBookings]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const rescheduleBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;
        const booking_id = req.params.booking_id as string;
        const { new_date, new_start_time, new_end_time } = req.body;

        if (!booking_id || !new_date || !new_start_time || !new_end_time) {
            res.status(400).json({ message: "booking_id, new_date, new_start_time, and new_end_time are required." });
            return;
        }

        // ── 1. Fetch the original booking ─────────────────────────────────────
        const booking = await prisma.bookings.findFirst({
            where: { booking_id, user_id: userId }
        });

        if (!booking) {
            res.status(404).json({ message: "Booking not found." });
            return;
        }

        if (booking.status !== "CONFIRMED") {
            res.status(409).json({
                message: `Only confirmed bookings can be rescheduled. This booking is ${booking.status.toLowerCase()}.`
            });
            return;
        }

        // ── 2. Enforce the 12-hour rule ───────────────────────────────────────
        const now = new Date();
        const msUntilStart = booking.start_time.getTime() - now.getTime();
        const thresholdMs = RESCHEDULE_WINDOW_HOURS * 60 * 60 * 1000;

        if (msUntilStart <= thresholdMs) {
            res.status(409).json({
                message: `Rescheduling is not allowed within ${RESCHEDULE_WINDOW_HOURS} hours of the booking start time.`
            });
            return;
        }

        // ── 3. Parse & normalise the new slot datetimes ───────────────────────
        const newDate = new Date(new_date);
        newDate.setUTCHours(0, 0, 0, 0);

        const [nsHour, nsMin, nsSec] = new_start_time.split(":").map(Number);
        const [neHour, neMin, neSec] = new_end_time.split(":").map(Number);

        const newStartTime = new Date(newDate);
        newStartTime.setUTCHours(nsHour, nsMin, nsSec, 0);

        const newEndTime = new Date(newDate);
        newEndTime.setUTCHours(neHour, neMin, neSec, 0);

        // ── 4. Guard: new slot must be in the future ──────────────────────────
        if (newStartTime.getTime() <= now.getTime()) {
            res.status(400).json({ message: "The new slot must be in the future." });
            return;
        }

        // ── 5. Guard: new slot must differ from the current slot ──────────────
        if (
            newStartTime.getTime() === booking.start_time.getTime() &&
            newDate.getTime() === booking.date.getTime()
        ) {
            res.status(400).json({ message: "The new slot is the same as the current booking slot." });
            return;
        }

        // ── 6. Atomic transaction ─────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {

            // 6a. Re-verify the original booking is still CONFIRMED inside the transaction
            const lockedBooking = await tx.bookings.findFirst({
                where: { booking_id, user_id: userId, status: "CONFIRMED" }
            });

            if (!lockedBooking) {
                throw new Error("BOOKING_UNAVAILABLE: The original booking is no longer available for rescheduling.");
            }

            // 6b. Check new slot is not already CONFIRMED
            const conflictingBooking = await tx.bookings.findFirst({
                where: {
                    court_id: lockedBooking.court_id,
                    date: newDate,
                    start_time: newStartTime,
                    status: "CONFIRMED"
                }
            });

            if (conflictingBooking) {
                const timeStr = newStartTime.toLocaleTimeString("en-US", {
                    hour12: true, hour: "2-digit", minute: "2-digit", timeZone: "UTC"
                });
                throw new Error(`SLOT_TAKEN: The new slot at ${timeStr} is already booked.`);
            }

            // 6c. Check new slot is not BLOCKED by the venue
            const blockedSlot = await tx.courtSlots.findFirst({
                where: {
                    court_id: lockedBooking.court_id,
                    date: newDate,
                    start_time: newStartTime,
                    status: "BLOCKED"
                }
            });

            if (blockedSlot) {
                const timeStr = newStartTime.toLocaleTimeString("en-US", {
                    hour12: true, hour: "2-digit", minute: "2-digit", timeZone: "UTC"
                });
                throw new Error(`SLOT_BLOCKED: The new slot at ${timeStr} is blocked by the venue.`);
            }

            // 6d. Record old values before mutation
            const oldDate = lockedBooking.date;
            const oldStartTime = lockedBooking.start_time;

            // 6e. Update the existing booking with new slot details (in-place, status stays CONFIRMED)
            await tx.bookings.update({
                where: { booking_id },
                data: {
                    date: newDate,
                    start_time: newStartTime,
                    end_time: newEndTime,
                    status: "CONFIRMED"
                }
            });

            // 6f. Write the reschedule history record
            await tx.reschedules.create({
                data: {
                    booking_id,
                    old_date: oldDate,
                    old_start_time: oldStartTime,
                    new_date: newDate,
                    new_start_time: newStartTime
                }
            });
        });

        // ── 7. Return the updated booking ─────────────────────────────────────
        const updatedBooking = await prisma.bookings.findUnique({
            where: { booking_id },
            include: {
                court: {
                    include: {
                        venue: {
                            select: { name: true, address: true, contact_number: true }
                        }
                    }
                },
                reschedules: {
                    orderBy: { rescheduled_at: "desc" },
                    take: 1
                }
            }
        });

        res.status(200).json({
            message: "Booking rescheduled successfully.",
            booking: updatedBooking
        });

    } catch (error: any) {
        console.error("[rescheduleBooking]", error);

        if (error.message?.startsWith("SLOT_TAKEN:") || error.message?.startsWith("SLOT_BLOCKED:")) {
            const userMessage = error.message.substring(error.message.indexOf(":") + 2);
            res.status(409).json({ message: userMessage });
        } else if (error.message?.startsWith("BOOKING_UNAVAILABLE:")) {
            const userMessage = error.message.substring(error.message.indexOf(":") + 2);
            res.status(409).json({ message: userMessage });
        } else {
            res.status(500).json({ message: "Internal server error during rescheduling." });
        }
    }
};