import { Request, Response } from "express";
import prisma from "../../db/prisma.js";

export const getVenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const venues = await prisma.venue.findMany();
        res.status(200).json(venues);
    } catch (error) {
        console.error("[getVenue]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};