import { Request, Response } from "express";
import prisma from "../../db/prisma.js";

export const createVenue = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;
    const { name, address, contact_number, email, opening_time, closing_time } = req.body;

    if (!name || !address || !contact_number || !email || !opening_time || !closing_time) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const venue = await prisma.venue.create({
            data: {
                name,
                address,
                contact_number,
                email,
                opening_time,
                closing_time,
                owner_id: userId,
            },
        });
        return res.status(201).json({ message: "Venue created successfully", venue });
    } catch (error) {
        console.error("[createVenue]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const createCourt = async (req: Request, res: Response) => {

    const { venue_id, court_number } = req.body;

    if (!venue_id || !court_number) {
        return res.status(400).json({ message: "All fileds are required!" });
    }

    try {
        const court = await prisma.court.create({
            data: {
                venue_id,
                court_number
            },
        });

        return res.status(201).json({ message: "Court created successfully", court });

    } catch (err) {
        console.error("[createCourt]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const removeCourt = async (req: Request, res: Response) => {
    const { court_id } = req.body;

    if (!court_id) {
        return res.status(400).json({ message: "All fileds are required!" });
    }

    try {
        const court = await prisma.court.delete({
            where: {
                court_id
            },
        });

        return res.status(200).json({ message: "Court removed successfully", court });

    } catch (err) {
        console.error("[removeCourt]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getBookings = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;

    try {
        const bookings = await prisma.bookings.findMany({
            where: {
                court: {
                    venue: {
                        owner_id: userId
                    }
                }
            },
            include: {
                court: {
                    select: {
                        venue: true,
                        court_id: true,
                        court_number: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });

        return res.status(200).json({ message: "Bookings fetched successfully", bookings });
    }
    catch (err) {
        console.error("[getBookings]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}