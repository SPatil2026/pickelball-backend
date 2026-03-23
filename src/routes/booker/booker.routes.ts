import { Router } from "express";
import { getAvailableSlots, getVenue, getVenueById } from "../../controller/booker/booker.controller.js";
import bookingsRouter from "../bookings/bookings.routes.js";
import cartRouter from "../cart/cart.routes.js";

const bookerRouter = Router();

bookerRouter.get("/venues", getVenue);
bookerRouter.get("/venues/:venue_id", getVenueById);
bookerRouter.get("/venues/:venue_id/slots", getAvailableSlots);

bookerRouter.use("/cart", cartRouter);

bookerRouter.use("/bookings", bookingsRouter);

export default bookerRouter;