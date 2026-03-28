import { z } from "zod";

export const createVenueSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        address: z.string().min(5, "Address must be at least 5 characters"),
        contact_number: z.string()
            .length(10, "Contact number must be 10 digits")
            .regex(/^[0-9]+$/, "Contact number must contain only digits"),
        email: z.string()
            .email("Invalid email address")
            .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address"),
        opening_time: z.string().datetime("Opening time must be a valid ISO date string"),
        closing_time: z.string().datetime("Closing time must be a valid ISO date string")
    })
});

export const updateVenueSchema = z.object({
    params: z.object({
        venue_id: z.string().uuid("Invalid venue ID format")
    }),
    body: z.object({
        name: z.string().min(2).optional(),
        address: z.string().min(5).optional(),
        contact_number: z.string()
            .length(10, "Contact number must be 10 digits")
            .regex(/^[0-9]+$/, "Contact number must contain only digits")
            .optional(),
        email: z.string()
            .email("Invalid email address")
            .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address")
            .optional(),
        opening_time: z.string().datetime().optional(),
        closing_time: z.string().datetime().optional()
    }).refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    })
});

export const deleteVenueSchema = z.object({
    params: z.object({
        venue_id: z.string().uuid("Invalid venue ID format")
    })
});

export const setPricingSchema = z.object({
    params: z.object({
        venue_id: z.string().uuid("Invalid venue ID format")
    }),
    body: z.object({
        pricing: z.array(z.object({
            day_type: z.enum(["WEEKDAY", "WEEKEND"]),
            price_per_hour: z.number().positive("Price must be a positive number")
        })).min(1, "At least one pricing entry is required")
    })
});

export const createCourtSchema = z.object({
    body: z.object({
        venue_id: z.string().uuid("Invalid venue ID format"),
        court_number: z.number().int().positive("Court number must be a positive integer").max(3, "Court number must be less than or equal to 3")
    })
});

export const removeCourtSchema = z.object({
    body: z.object({
        court_id: z.string().uuid("Invalid court ID format")
    })
});

export const getBookingsSchema = z.object({
    query: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional()
    })
});

export const getOwnerVenueByIdSchema = z.object({
    params: z.object({
        venue_id: z.string().uuid("Invalid venue ID format")
    })
});

