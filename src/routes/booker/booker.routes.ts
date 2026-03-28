import { Router } from "express";
import { getAvailableSlots, getVenue, getVenueById } from "../../controller/booker/booker.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { getAvailableSlotsSchema, getVenueByIdSchema, getVenuesSchema } from "../../validator/booker.validator.js";
import bookingsRouter from "../bookings/bookings.routes.js";
import cartRouter from "../cart/cart.routes.js";

const bookerRouter = Router();

bookerRouter.get("/venues", validate(getVenuesSchema), getVenue);
bookerRouter.get("/venues/:venue_id", validate(getVenueByIdSchema), getVenueById);
bookerRouter.get("/venues/:venue_id/slots", validate(getAvailableSlotsSchema), getAvailableSlots);

bookerRouter.use("/cart", cartRouter);

bookerRouter.use("/bookings", bookingsRouter);

export default bookerRouter;