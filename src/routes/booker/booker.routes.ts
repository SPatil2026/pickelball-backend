import { Router } from "express";
import { getAvailableSlots, getVenue } from "../../controller/booker/booker.controller.js";
import { verifyToken } from "../../utils/token-manager.js";
import bookingsRouter from "../bookings/bookings.routes.js";
import cartRouter from "../cart/cart.routes.js";

const bookerRouter = Router();

bookerRouter.get("/venues", verifyToken, getVenue);
bookerRouter.get("/available-slots", verifyToken, getAvailableSlots);

bookerRouter.use("/cart", verifyToken, cartRouter);

bookerRouter.use("/bookings", verifyToken, bookingsRouter);

export default bookerRouter;