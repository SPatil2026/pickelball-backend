import { Request, Response } from "express";
import prisma from "../../db/prisma.js";

export const getVenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const venues = await prisma.venue.findMany({
            select: {
                name: true,
                address: true,
                contact_number: true,
                courts: {
                    select: {
                        court_id: true,
                        court_number: true
                    },
                    orderBy: {
                        court_number: 'asc'
                    }
                },
                images: {
                    select: {
                        image_url: true,
                        is_thumbnail: true
                    }
                }
            }
        });
        res.status(200).json(venues);
    } catch (error) {
        console.error("[getVenue]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

import { generateTimeIntervals } from "../../utils/time.utils.js";

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    const { venue_id, date } = req.query;
    const userId = res.locals.jwtData.user_id;

    if (!venue_id || !date) {
        res.status(400).json({ message: "venue_id and date are required" });
        return;
    }

    try {
        const parsedDate = new Date(date as string);

        // 1. Get Venue for opening/closing times
        const venue = await prisma.venue.findUnique({
            where: { venue_id: venue_id as string },
            include: {
                courts: {
                    select: {
                        court_id: true,
                        court_number: true
                    },
                    orderBy: {
                        court_number: 'asc'
                    }
                }
            }
        });

        if (!venue) {
            res.status(404).json({ message: "Venue not found" });
            return;
        }

        if (venue.courts.length === 0) {
            res.status(404).json({ message: "No courts found for this venue" });
            return;
        }

        // 2. Generate all intervals
        const allIntervals = generateTimeIntervals(venue.opening_time, venue.closing_time);

        // 3. Get existing bookings for the day across all courts in this venue
        const startOfDay = new Date(parsedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(parsedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const courtIds = venue.courts.map(c => c.court_id);

        const existingBookings = await prisma.bookings.findMany({
            where: {
                court_id: { in: courtIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: "CONFIRMED"
            }
        });

        // 4. Get blocked slots across all courts
        const blockedSlots = await prisma.courtSlots.findMany({
            where: {
                court_id: { in: courtIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: "BLOCKED"
            }
        });

        // get incart slots for that current user
        const incartSlots = await prisma.cartItems.findMany({
            where: {
                court_id: { in: courtIds },
                cart: {
                    user_id: userId
                },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: "IN_CART"
            }
        });

        // 5. Merge and determine availability grouped by time then by court
        const timeOptions: Intl.DateTimeFormatOptions = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' };

        const availableSlots = allIntervals.map(interval => {
            const courtsAvailability = venue.courts.map(court => {

                const isBooked = existingBookings.some(booking => {
                    const bookingStart = booking.start_time.toLocaleTimeString('en-US', timeOptions);
                    const bookingEnd = booking.end_time.toLocaleTimeString('en-US', timeOptions);
                    return booking.court_id === court.court_id && bookingStart === interval.start_time && bookingEnd === interval.end_time;
                });

                const isBlocked = blockedSlots.some(slot => {
                    const slotStart = slot.start_time.toLocaleTimeString('en-US', timeOptions);
                    const slotEnd = slot.end_time.toLocaleTimeString('en-US', timeOptions);
                    return slot.court_id === court.court_id && slotStart === interval.start_time && slotEnd === interval.end_time;
                });

                const isInCart = incartSlots.some(slot => {
                    const slotStart = slot.start_time.toLocaleTimeString('en-US', timeOptions);
                    const slotEnd = slot.end_time.toLocaleTimeString('en-US', timeOptions);
                    return slot.court_id === court.court_id && slotStart === interval.start_time && slotEnd === interval.end_time;
                });

                let status = "AVAILABLE";
                if (isBlocked) status = "BLOCKED";
                else if (isBooked) status = "BOOKED";
                else if (isInCart) status = "IN_CART";

                return {
                    court_id: court.court_id,
                    court_number: court.court_number,
                    status
                };
            });

            return {
                start_time: interval.start_time,
                end_time: interval.end_time,
                courts: courtsAvailability
            };
        });

        res.status(200).json(availableSlots);

    } catch (error) {
        console.error("[getAvailableSlots]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
