import { Request, Response } from "express";
import prisma from "../../db/prisma.js";
import { combineDateAndTime } from "../../utils/time.utils.js";
import { validateSlotAvailability } from "../../utils/booking.utils.js";
import { DayType, SlotStatus } from "@prisma/client";

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
                },
                _count: {
                    select: {
                        items: true
                    }
                }
            }
        });

        if (!cart) {
            res.status(200).json({ items: [], total_amount: 0 });
            return;
        }

        const total_amount = cart.items.reduce((acc, item) => acc + item.price, 0);

        res.status(200).json({ cart, total_amount });
    } catch (error) {
        console.error("[getCart]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;
        const { court_id, date, start_time, end_time } = req.body;

        // 1. Process dates + times exactly like the availability checker (UTC)
        const bookingDate = new Date(date as string);
        bookingDate.setUTCHours(0, 0, 0, 0);

        const reqStartTime = combineDateAndTime(bookingDate, start_time);
        const reqEndTime = combineDateAndTime(bookingDate, end_time);

        // Start time and end time cannot be the same
        if (reqStartTime.getTime() === reqEndTime.getTime()) {
            res.status(400).json({ message: "Start time and end time cannot be the same." });
            return;
        }

        // End time must be after start time
        if (reqEndTime <= reqStartTime) {
            res.status(400).json({ message: "End time must be after start time." });
            return;
        }

        // Minimum duration = 1 hour
        const diffInMs = reqEndTime.getTime() - reqStartTime.getTime();
        const oneHour = 60 * 60 * 1000;

        if (diffInMs < oneHour) {
            res.status(400).json({ message: "Minimum booking duration is 1 hour." });
            return;
        }

        // 2. Race Condition Check: Prevent adding to cart if it's already booked or blocked
        try {
            await validateSlotAvailability(prisma, court_id, bookingDate, reqStartTime);
        } catch (error: any) {
            res.status(409).json({ message: error.message.includes(':') ? error.message.split(': ')[1] : error.message });
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
        const dayType = isWeekday ? DayType.WEEKDAY : DayType.WEEKEND;

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
                status: SlotStatus.IN_CART
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
        const userId = res.locals.jwtData.user_id;
        const { cart_item_id } = req.params;

        if (!cart_item_id || cart_item_id === "undefined") {
            res.status(400).json({ message: "Cart item ID is required." });
            return;
        }

        // Defensive: Ensure the cart item belongs to the user's cart
        const result = await prisma.cartItems.deleteMany({
            where: {
                cart_item_id: cart_item_id as string,
                cart: {
                    user_id: userId
                }
            }
        });

        if (result.count === 0) {
            res.status(404).json({ message: "Cart item not found or you do not have permission to remove it." });
            return;
        }

        res.status(200).json({ message: "Removed from cart successfully" });
    } catch (error) {
        console.error("[removeFromCart]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.jwtData.user_id;

        const result = await prisma.cartItems.deleteMany({
            where: {
                cart: {
                    user_id: userId
                }
            }
        });

        if (result.count === 0) {
            res.status(200).json({ message: "Cart is already empty." });
            return;
        }

        res.status(200).json({ message: "Cart cleared successfully." });
    } catch (error) {
        console.error("[clearCart]", error);
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

        // find the total amount
        const totalAmount = cart.items.reduce((sum, item) => sum + item.price, 0);

        // 2. Start Atomic Transaction
        await prisma.$transaction(async (tx) => {

            // 3. Re-Verification Lock
            for (const item of cart.items) {
                // Throws SLOT_TAKEN or SLOT_BLOCKED if unavailable
                await validateSlotAvailability(tx, item.court_id, item.date, item.start_time);
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
        res.status(200).json({ message: "Checkout successful! Your slots are confirmed.", totalAmount });

    } catch (error: any) {
        console.error("[checkout]", error);

        // P2002: Unique constraint failed
        if (error.code === "P2002") {
            res.status(409).json({ message: "One or more slots in your cart have just been booked by someone else." });
            return;
        }

        if (error.message?.includes("SLOT_TAKEN:") || error.message?.includes("SLOT_BLOCKED:")) {
            const userMessage = error.message.includes(':') ? error.message.split(': ')[1] : error.message;
            res.status(409).json({ message: userMessage });
        } else {
            res.status(500).json({ message: "Internal server error during checkout" });
        }
    }
};
