import { Request, Response } from "express";
import prisma from "../../db/prisma.js";

export const getVenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const venues = await prisma.venue.findMany({
            select: {
                name: true,
                address: true,
                contact_number: true,
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
                    select: {
                        image_url: true,
                        is_thumbnail: true
                    }
                }
            }
        });
        res.status(200).json(venues);
    } catch (error) {
        console.error("[getVenue]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

import { generateTimeIntervals } from "../../utils/time.utils.js";

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
    const { venue_id, date } = req.query;
    const userId = res.locals.jwtData.user_id;

    if (!venue_id || !date) {
        res.status(400).json({ message: "venue_id and date are required" });
        return;
    }

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

        // 5. Merge and determine availability grouped by time then by court
        const timeOptions: Intl.DateTimeFormatOptions = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' };

        const availableSlots = allIntervals.map(interval => {
            const courtsAvailability = venue.courts.map(court => {

                const isBooked = existingBookings.some(booking => {
                    const bookingStart = booking.start_time.toLocaleTimeString('en-US', timeOptions);
                    const bookingEnd = booking.end_time.toLocaleTimeString('en-US', timeOptions);
                    return booking.court_id === court.court_id && bookingStart === interval.start_time && bookingEnd === interval.end_time;
                });

                const isBlocked = blockedSlots.some(slot => {
                    const slotStart = slot.start_time.toLocaleTimeString('en-US', timeOptions);
                    const slotEnd = slot.end_time.toLocaleTimeString('en-US', timeOptions);
                    return slot.court_id === court.court_id && slotStart === interval.start_time && slotEnd === interval.end_time;
                });

                const isInCart = incartSlots.some(slot => {
                    const slotStart = slot.start_time.toLocaleTimeString('en-US', timeOptions);
                    const slotEnd = slot.end_time.toLocaleTimeString('en-US', timeOptions);
                    return slot.court_id === court.court_id && slotStart === interval.start_time && slotEnd === interval.end_time;
                });

                let status = "AVAILABLE";
                if (isBlocked) status = "BLOCKED";
                else if (isBooked) status = "BOOKED";
                else if (isInCart) status = "IN_CART";

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

export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;

        const cart = await prisma.cart.findFirst({
            where: { user_id: userId },
            include: {
                items: {
                    include: {
                        court: {
                            include: {
                                venue: true
                            }
                        }
                    }
                }
            }
        });

        if (!cart) {
            res.status(200).json({ items: [] });
            return;
        }

        res.status(200).json(cart);
    } catch (error) {
        console.error("[getCart]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;
        const { court_id, date, start_time, end_time } = req.body;

        if (!court_id || !date || !start_time || !end_time) {
            res.status(400).json({ message: "All fields are required" });
            return;
        }

        // 1. Process dates exactly like the availability checker (UTC)
        const bookingDate = new Date(date);
        bookingDate.setUTCHours(0, 0, 0, 0);

        // Convert the string times (e.g., "08:00:00") into comparable Date objects
        const [startHour, startMin, startSec] = start_time.split(':').map(Number);
        const [endHour, endMin, endSec] = end_time.split(':').map(Number);

        const reqStartTime = new Date(bookingDate);
        reqStartTime.setUTCHours(startHour, startMin, startSec, 0);

        const reqEndTime = new Date(bookingDate);
        reqEndTime.setUTCHours(endHour, endMin, endSec, 0);

        // 2. Race Condition Check: Prevent adding to cart if it's already booked
        const existingBooking = await prisma.bookings.findFirst({
            where: {
                court_id: court_id,
                date: bookingDate,
                start_time: reqStartTime,
                status: "CONFIRMED"
            }
        });

        if (existingBooking) {
            res.status(409).json({ message: "This slot has already been booked." });
            return;
        }

        // 3. Prevent adding if manually blocked
        const existingBlocked = await prisma.courtSlots.findFirst({
            where: {
                court_id: court_id,
                date: bookingDate,
                start_time: reqStartTime,
                status: "BLOCKED"
            }
        });

        if (existingBlocked) {
            res.status(409).json({ message: "This slot is currently blocked by the venue." });
            return;
        }

        // 4. Find or Create Cart
        let cart = await prisma.cart.findFirst({
            where: { user_id: userId }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { user_id: userId }
            });
        }

        // 5. Prevent double adding to the SAME user's cart
        const existingCartItem = await prisma.cartItems.findFirst({
            where: {
                cart_id: cart.cart_id,
                court_id: court_id,
                date: bookingDate,
                start_time: reqStartTime
            }
        });

        if (existingCartItem) {
            res.status(400).json({ message: "This slot is already in your cart." });
            return;
        }

        const venueid = await prisma.court.findFirst({
            where: {
                court_id: court_id
            },
            select: {
                venue_id: true
            }
        });

        // get if the day of booking is weekday or weekend
        const dayOfWeek = bookingDate.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const dayType = isWeekday ? "WEEKDAY" : "WEEKEND";

        // get the pricing from the pricing table for that court
        const pricing = await prisma.pricing.findFirst({
            where: {
                venue_id: venueid?.venue_id,
                day_type: dayType
            },
            select: {
                price_per_hour: true
            }
        });

        // 6. Add to Cart Items
        const newCartItem = await prisma.cartItems.create({
            data: {
                cart_id: cart.cart_id,
                court_id: court_id,
                date: bookingDate,
                start_time: reqStartTime,
                end_time: reqEndTime,
                price: pricing?.price_per_hour || 0,
                status: "IN_CART"
            }
        });

        res.status(201).json({ message: "Added to cart successfully", item: newCartItem });

    } catch (error) {
        console.error("[addToCart]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cart_item_id } = req.params;

        if (!cart_item_id) {
            res.status(400).json({ message: "Cart item ID is required" });
            return;
        }

        await prisma.cartItems.delete({
            where: { cart_item_id: cart_item_id as string }
        });

        res.status(200).json({ message: "Removed from cart successfully" });
    } catch (error) {
        console.error("[removeFromCart]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const checkout = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;

        // 1. Fetch Cart and Items
        const cart = await prisma.cart.findFirst({
            where: { user_id: userId },
            include: { items: true }
        });

        if (!cart || cart.items.length === 0) {
            res.status(400).json({ message: "Your cart is empty." });
            return;
        }

        // 2. Start Atomic Transaction
        await prisma.$transaction(async (tx) => {

            // 3. Re-Verification Lock
            for (const item of cart.items) {
                // Check if someone else just booked it
                const existingBooking = await tx.bookings.findFirst({
                    where: {
                        court_id: item.court_id,
                        date: item.date,
                        start_time: item.start_time,
                        status: "CONFIRMED"
                    }
                });

                if (existingBooking) {
                    const timeStr = item.start_time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                    throw new Error(`The slot at ${timeStr} is no longer available.`);
                }

                // Check if the venue owner just manually blocked it
                const existingBlocked = await tx.courtSlots.findFirst({
                    where: {
                        court_id: item.court_id,
                        date: item.date,
                        start_time: item.start_time,
                        status: "BLOCKED"
                    }
                });

                if (existingBlocked) {
                    const timeStr = item.start_time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                    throw new Error(`The slot at ${timeStr} was just blocked by the venue.`);
                }
            }

            // 4. Convert Cart Items to Bookings
            const bookingsData = cart.items.map(item => ({
                user_id: userId,
                court_id: item.court_id,
                date: item.date,
                start_time: item.start_time,
                end_time: item.end_time,
                total_amount: item.price,
                status: "CONFIRMED" as const
            }));

            await tx.bookings.createMany({
                data: bookingsData
            });

            // 5. Clear the Cart
            await tx.cartItems.deleteMany({
                where: { cart_id: cart.cart_id }
            });

            // Note: We don't delete the `Cart` itself, just the items, 
            // so the user still has a cart object for future use.
        });

        // 6. Transaction completed successfully
        res.status(200).json({ message: "Checkout successful! Your slots are confirmed." });

    } catch (error: any) {
        console.error("[checkout]", error);

        // If our custom double-booking error was thrown inside the transaction, send it to the UI
        if (error.message && error.message.includes("no longer available") || error.message.includes("blocked by the venue")) {
            res.status(409).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Internal server error during checkout" });
        }
    }
};
