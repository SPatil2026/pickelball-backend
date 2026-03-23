import { Router } from "express";
import { getMyBookings, rescheduleBooking } from "../../controller/bookings/bookings.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { rescheduleBookingSchema, getMyBookingsSchema } from "../../validator/booking.validator.js";

const bookingsRouter = Router();

bookingsRouter.get("/", validate(getMyBookingsSchema), getMyBookings);
bookingsRouter.post("/:booking_id/reschedule", validate(rescheduleBookingSchema), rescheduleBooking);

export default bookingsRouter;