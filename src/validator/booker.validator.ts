import { z } from "zod";

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

export const getVenuesSchema = z.object({
    query: z.object({
        date: z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .optional()
            .refine((date) => !date || new Date(date) >= today, {
                message: "Date cannot be in the past"
            }),
        time: z.string()
            .regex(/^\d{2}:\d{2}:\d{2}$/, "Invalid time format (HH:MM:SS)")
            .optional()
    })
});

export const getVenueByIdSchema = z.object({
    params: z.object({
        venue_id: z.string().uuid("Invalid venue ID format")
    })
});

export const getAvailableSlotsSchema = z.object({
    params: z.object({
        venue_id: z.string().uuid("Invalid venue ID format")
    }),
    query: z.object({
        date: z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .refine((date) => new Date(date) >= today, {
                message: "Date cannot be in the past"
            })
    })
});
