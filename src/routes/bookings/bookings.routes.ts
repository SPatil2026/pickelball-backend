import { Router } from "express";
import { getMyBookings, rescheduleBooking } from "../../controller/bookings/bookings.controller.js";

const bookingsRouter = Router();

bookingsRouter.get("/", getMyBookings);
bookingsRouter.post("/:booking_id/reschedule", rescheduleBooking);

export default bookingsRouter;