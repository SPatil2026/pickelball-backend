import { Request, Response } from "express";
import prisma from "../../db/prisma.js";
import { generateTimeIntervals, formatTimeToUTC, combineDateAndTime } from "../../utils/time.utils.js";

export const getVenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, time, address } = req.query;

        let whereClause: any = {};

        if (address) {
            whereClause.address = {
                contains: address as string,
                mode: 'insensitive'
            };
        }

        // if (name) {
        //     whereClause.name = {
        //         contains: name as string,
        //         mode: 'insensitive'
        //     };
        // }

        if (date && time) {
            const bookingDate = new Date(date as string);
            bookingDate.setUTCHours(0, 0, 0, 0);
            const reqStartTime = combineDateAndTime(bookingDate, time as string);

            whereClause.courts = {
                some: {
                    AND: [
                        { bookings: { none: { date: bookingDate, start_time: reqStartTime, status: 'CONFIRMED' } } },
                        { slots: { none: { date: bookingDate, start_time: reqStartTime, status: 'BLOCKED' } } },
                        { cartItems: { none: { date: bookingDate, start_time: reqStartTime, status: 'IN_CART' } } }
                    ]
                }
            };
        }

        const venues = await prisma.venue.findMany({
            where: whereClause,
            select: {
                venue_id: true,
                name: true,
                address: true,
                contact_number: true,
                opening_time: true,
                closing_time: true,
                courts: {
                    select: {
                        court_id: true,
                        court_number: true
                    },
                    orderBy: {
                        court_number: 'asc'
                    }
                },
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

        let filteredVenues = venues;

        if (date && time) {
            const requestedTimeStr = formatTimeToUTC(combineDateAndTime(new Date(), time as string));
            filteredVenues = venues.filter(v => {
                const openStr = formatTimeToUTC(v.opening_time);
                const closeStr = formatTimeToUTC(v.closing_time);
                return requestedTimeStr >= openStr && requestedTimeStr < closeStr;
            });
        }

        res.status(200).json(filteredVenues);
    } catch (error) {
        console.error("[getVenue]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getVenueById = async (req: Request, res: Response): Promise<void> => {
    try {
        const venue_id = req.params.venue_id as string;

        const venue = await prisma.venue.findUnique({
            where: { venue_id },
            select: {
                name: true,
                address: true,
                contact_number: true,
                email: true,
                opening_time: true,
                closing_time: true,
                images: {
                    select: {
                        image_url: true,
                        is_thumbnail: true
                    }
                },
                pricing: {
                    select: {
                        day_type: true,
                        price_per_hour: true
                    }
                },
                _count: {
                    select: {
                        courts: true
                    }
                }
            }
        });

        if (!venue) {
            res.status(404).json({ message: "Venue not found" });
            return;
        }

        res.status(200).json(venue);
    } catch (error) {
        console.error("[getVenueById]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    const venue_id = req.params.venue_id as string;
    const { date } = req.query;
    const userId = res.locals.jwtData.user_id;

    try {
        const parsedDate = new Date(date as string);

        // 1. Get Venue for opening/closing times
        const venue = await prisma.venue.findUnique({
            where: { venue_id: venue_id as string },
            include: {
                courts: {
                    select: {
                        court_id: true,
                        court_number: true
                    },
                    orderBy: {
                        court_number: 'asc'
                    }
                }
            }
        });

        if (!venue) {
            res.status(404).json({ message: "Venue not found" });
            return;
        }

        if (venue.courts.length === 0) {
            res.status(404).json({ message: "No courts found for this venue" });
            return;
        }

        // 2. Generate all intervals
        const allIntervals = generateTimeIntervals(venue.opening_time, venue.closing_time);

        // 3. Get existing bookings for the day across all courts in this venue
        const startOfDay = new Date(parsedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(parsedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const courtIds = venue.courts.map(c => c.court_id);

        const existingBookings = await prisma.bookings.findMany({
            where: {
                court_id: { in: courtIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: "CONFIRMED"
            }
        });

        // 4. Get blocked slots across all courts
        const blockedSlots = await prisma.courtSlots.findMany({
            where: {
                court_id: { in: courtIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: "BLOCKED"
            }
        });

        // get incart slots for that current user
        const incartSlots = await prisma.cartItems.findMany({
            where: {
                court_id: { in: courtIds },
                cart: {
                    user_id: userId
                },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: "IN_CART"
            }
        });

        // 5. Pre-compute Hash Maps (Sets) for O(1) lookups
        const bookedSet = new Set(existingBookings.map(b => `${b.court_id}-${formatTimeToUTC(b.start_time)}`));
        const blockedSet = new Set(blockedSlots.map(s => `${s.court_id}-${formatTimeToUTC(s.start_time)}`));
        const inCartSet = new Set(incartSlots.map(c => `${c.court_id}-${formatTimeToUTC(c.start_time)}`));

        // 6. Merge and determine availability grouped by time then by court
        const availableSlots = allIntervals.map(interval => {
            const courtsAvailability = venue.courts.map(court => {
                const key = `${court.court_id}-${interval.start_time}`;

                let status = "AVAILABLE";
                if (blockedSet.has(key)) status = "BLOCKED";
                else if (bookedSet.has(key)) status = "BOOKED";
                else if (inCartSet.has(key)) status = "IN_CART";

                return {
                    court_id: court.court_id,
                    court_number: court.court_number,
                    status
                };
            });

            return {
                start_time: interval.start_time,
                end_time: interval.end_time,
                courts: courtsAvailability
            };
        });

        res.status(200).json(availableSlots);

    } catch (error) {
        console.error("[getAvailableSlots]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
