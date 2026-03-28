import { z } from "zod";

export const addToCartSchema = z.object({
    body: z.object({
        court_id: z.string().uuid("Invalid court ID format"),
        date: z.string()
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
        start_time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)"),
        end_time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)")
    })
});

export const removeFromCartSchema = z.object({
    params: z.object({
        cart_item_id: z.string().uuid("Invalid cart item ID format")
    })
});

export const checkoutSchema = z.object({
    body: z.object({}).strict()
});

export const clearCartSchema = z.object({
    body: z.object({}).strict()
});


