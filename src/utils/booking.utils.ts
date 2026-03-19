import { formatTimeToUTC } from "./time.utils.js";

/**
 * Validates if a slot is available (not booked and not blocked).
 * Throws an Error with a descriptive message if there is a conflict.
 * 
 * @param tx Prisma transaction or client
 * @param courtId ID of the court
 * @param date The date of the slot
 * @param startTime The start time of the slot (DateTime)
 */
export const validateSlotAvailability = async (
    tx: any,
    courtId: string,
    date: Date,
    startTime: Date
): Promise<void> => {
    
    // 1. Check for confirmed bookings
    const existingBooking = await tx.bookings.findFirst({
        where: {
            court_id: courtId,
            date: date,
            start_time: startTime,
            status: "CONFIRMED"
        }
    });

    if (existingBooking) {
        const timeStr = formatTimeToUTC(startTime);
        throw new Error(`SLOT_TAKEN: The slot at ${timeStr} is already booked.`);
    }

    // 2. Check for blocked slots
    const blockedSlot = await tx.courtSlots.findFirst({
        where: {
            court_id: courtId,
            date: date,
            start_time: startTime,
            status: "BLOCKED"
        }
    });

    if (blockedSlot) {
        const timeStr = formatTimeToUTC(startTime);
        throw new Error(`SLOT_BLOCKED: The slot at ${timeStr} is blocked by the venue.`);
    }
};
