import { z } from "zod";

export const rescheduleBookingSchema = z.object({
    params: z.object({
        booking_id: z.string().uuid("Invalid booking ID format")
    }),
    body: z.object({
        new_date: z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .refine((dateStr) => {
                const bookingDate = new Date(dateStr);
                bookingDate.setUTCHours(0, 0, 0, 0);
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
                const maxDate = new Date(today);
                maxDate.setUTCDate(maxDate.getUTCDate() + 7);
                return bookingDate >= today && bookingDate <= maxDate;
            }, "Booking date must be between today and 4 days from now"),
        new_start_time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)"),
        new_end_time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)")
    })
});

export const getMyBookingsSchema = z.object({
    body: z.object({}).strict()
});

export const cancelBookingSchema = z.object({
    params: z.object({
        booking_id: z.string().uuid("Invalid booking ID format")
    })
});

