import { Request, Response } from "express";
import prisma from "../../db/prisma.js";

export const createVenue = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;
    const { name, address, contact_number, email, opening_time, closing_time } = req.body;

    try {

        const result = await prisma.$transaction(async (tx) => {
            const venue = await tx.venue.create({
                data: {
                    name,
                    address,
                    contact_number,
                    email,
                    opening_time: new Date(opening_time),
                    closing_time: new Date(closing_time),
                    owner_id: userId,
                },
            });

            // add deafult pricing to the venue
            await tx.pricing.create({
                data: {
                    venue_id: venue.venue_id,
                    day_type: "WEEKDAY",
                    price_per_hour: 500,
                },
            });

            await tx.pricing.create({
                data: {
                    venue_id: venue.venue_id,
                    day_type: "WEEKEND",
                    price_per_hour: 700,
                },
            });
        })
        return res.status(201).json({ message: "Venue created successfully", result });
    } catch (error) {
        console.error("[createVenue]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getOnwerVenue = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;

    try {
        const venues = await prisma.venue.findMany({
            where: { owner_id: userId },
            include: {
                courts: true,
                pricing: true,
                images: {
                    where: {
                        is_thumbnail: true
                    },
                    select: {
                        image_url: true
                    }
                }
            }
        });
        return res.status(200).json({ message: "Venues fetched successfully", venues });
    } catch (error) {
        console.error("[getOnwerVenue]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getOwnerVenueById = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;
    const venue_id = req.params.venue_id as string;

    try {
        const venue = await prisma.venue.findFirst({
            where: { venue_id, owner_id: userId },
            select: {
                venue_id: true,
                name: true,
                address: true,
                contact_number: true,
                email: true,
                opening_time: true,
                closing_time: true,
                _count: {
                    select: {
                        courts: true,
                        pricing: true
                    }
                },
                images: {
                    select: {
                        image_url: true,
                        is_thumbnail: true
                    }
                }

            }
        });
        return res.status(200).json({ message: "Venue fetched successfully", venue });
    } catch (error) {
        console.error("[getOwnerVenueById]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteVenue = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;
    const venue_id = req.params.venue_id as string;

    try {
        // Verify ownership
        const venue = await prisma.venue.findFirst({
            where: { venue_id, owner_id: userId }
        });

        if (!venue) {
            return res.status(403).json({ message: "You do not have permission to delete this venue." });
        }

        const deletedVenue = await prisma.venue.delete({
            where: {
                venue_id
            },
        });

        return res.status(200).json({ message: "Venue deleted successfully", venue: deletedVenue });

    } catch (err) {
        console.error("[deleteVenue]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const createCourt = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;
    const { venue_id, court_number } = req.body;

    try {
        // Verify ownership
        const venue = await prisma.venue.findFirst({
            where: { venue_id, owner_id: userId }
        });

        if (!venue) {
            return res.status(403).json({ message: "You do not have permission to add courts to this venue." });
        }

        const existingCourt = await prisma.court.findFirst({
            where: { venue_id, court_number }
        });

        if (existingCourt) {
            return res.status(400).json({ message: "Court already exists." });
        }

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
    const userId = res.locals.jwtData.user_id;
    const { court_id } = req.body;

    try {
        // Verify ownership via venue
        const courtExists = await prisma.court.findFirst({
            where: { court_id },
            include: { venue: true }
        });

        if (!courtExists) {
            return res.status(404).json({ message: "Court not found." });
        }

        if (courtExists.venue.owner_id !== userId) {
            return res.status(403).json({ message: "You do not have permission to remove this court." });
        }

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

export const getBookings = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.jwtData.user_id;
    const { date } = req.query;

    try {
        const whereClause: any = {
            court: {
                venue: {
                    owner_id: userId
                }
            }
        };

        if (date) {
            const parsedDate = new Date(date as string);
            const startOfDay = new Date(parsedDate);
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(parsedDate);
            endOfDay.setUTCHours(23, 59, 59, 999);

            whereClause.date = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const bookings = await prisma.bookings.findMany({
            where: whereClause,
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

        res.status(200).json({ message: "Bookings fetched successfully", bookings });
    }
    catch (err) {
        console.error("[getBookings]", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateVenue = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.jwtData.user_id;
    const venue_id = req.params.venue_id as string;
    const { name, address, contact_number, email, opening_time, closing_time } = req.body;

    try {
        // Verify the venue belongs to this owner
        const venue = await prisma.venue.findFirst({
            where: { venue_id, owner_id: userId }
        });

        if (!venue) {
            res.status(404).json({ message: "Venue not found or you do not have permission to update it." });
            return;
        }

        const updatedVenue = await prisma.venue.update({
            where: { venue_id },
            data: {
                ...(name && { name }),
                ...(address && { address }),
                ...(contact_number && { contact_number }),
                ...(email && { email }),
                ...(opening_time && { opening_time: new Date(opening_time) }),
                ...(closing_time && { closing_time: new Date(closing_time) })
            }
        });

        res.status(200).json({ message: "Venue updated successfully.", venue: updatedVenue });
    } catch (error) {
        console.error("[updateVenue]", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const setPricing = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.jwtData.user_id;
    const venue_id = req.params.venue_id as string;

    const { pricing } = req.body;

    try {
        // Verify the venue belongs to this owner
        const venue = await prisma.venue.findFirst({
            where: { venue_id, owner_id: userId }
        });

        if (!venue) {
            res.status(404).json({ message: "Venue not found or you do not have permission to set pricing for it." });
            return;
        }

        // Upsert each pricing entry (create or update)
        const results = await Promise.all(
            pricing.map((entry) =>
                prisma.pricing.upsert({
                    where: {
                        venue_id_day_type: {
                            venue_id,
                            day_type: entry.day_type
                        }
                    },
                    update: { price_per_hour: entry.price_per_hour },
                    create: {
                        venue_id,
                        day_type: entry.day_type,
                        price_per_hour: entry.price_per_hour
                    }
                })
            )
        );

        res.status(200).json({ message: "Pricing set successfully.", pricing: results });
    } catch (error) {
        console.error("[setPricing]", error);
        res.status(500).json({ message: "Internal server error" });
    }
}