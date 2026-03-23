import { z } from "zod";

export const rescheduleBookingSchema = z.object({
    params: z.object({
        booking_id: z.string().uuid("Invalid booking ID format")
    }),
    body: z.object({
        new_date: z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        new_start_time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)"),
        new_end_time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)")
    })
});

export const getMyBookingsSchema = z.object({
    body: z.object({}).strict()
});
