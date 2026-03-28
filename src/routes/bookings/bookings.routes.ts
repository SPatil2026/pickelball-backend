import { Router } from "express";
import { cancelBooking, getMyBookings, rescheduleBooking } from "../../controller/bookings/bookings.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { cancelBookingSchema, rescheduleBookingSchema } from "../../validator/booking.validator.js";

const bookingsRouter = Router();

bookingsRouter.get("/", getMyBookings);
bookingsRouter.post("/:booking_id/reschedule", validate(rescheduleBookingSchema), rescheduleBooking);
bookingsRouter.post("/:booking_id/cancel", validate(cancelBookingSchema), cancelBooking);

export default bookingsRouter;