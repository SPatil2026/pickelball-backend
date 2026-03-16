import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../db/prisma.js";
import { createToken } from "../../utils/token-manager.js";
import { COOKIE_NAME } from "../../utils/constants.js";
import { Role } from "@prisma/client";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Register
export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ message: "Name, email, and password are required" });
        return;
    }

    try {
        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ message: "User already exists with this email" });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                name,
                email,
                password_hash,
                phone: phone ?? null,
                role: (role as Role) ?? Role.BOOKER,
            },
            select: {
                user_id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                created_at: true,
            },
        });

        const token = createToken(user.user_id, user.email, "7d");

        res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

        res.status(201).json({
            message: "User registered successfully",
            user,
        });
    } catch (error) {
        console.error("[register]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }

    try {
        const user = await prisma.users.findUnique({ where: { email } });

        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const token = createToken(user.user_id, user.email, "7d");

        // Clear any stale cookie before setting a fresh one
        res.clearCookie(COOKIE_NAME);
        res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

        res.status(200).json({
            message: "Login successful",
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    } catch (error) {
        console.error("[login]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Logout
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            signed: true,
        });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("[logout]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
