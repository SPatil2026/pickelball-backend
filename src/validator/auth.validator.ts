import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, "Name must be at least 2 characters long")
            .regex(/^[a-zA-Z ]+$/, "Name must contain only letters and spaces"),
        email: z.string()
            .email("Invalid email address")
            .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address"),
        password: z.string()
            .min(8, "Password must be at least 8 characters long")
            .regex(/[a-zA-Z]/, "Password must contain at least one letter")
            .regex(/\d/, "Password must contain at least one number"),
        phone: z.string()
            .min(10, "Phone number must be at least 10 digits long")
            .regex(/^[0-9]+$/, "Phone number must contain only digits"),
        role: z.enum(["OWNER", "BOOKER"])
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .email("Invalid email address")
            .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address"),
        password: z.string()
            .min(8, "Password must be at least 8 characters long")
            .regex(/[a-zA-Z]/, "Password must contain at least one letter")
            .regex(/\d/, "Password must contain at least one number"),
    })
});