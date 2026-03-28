import { Router } from "express";
import { createCourt, createVenue, getBookings, removeCourt, updateVenue, setPricing, deleteVenue, getOnwerVenue, getOwnerVenueById, getOwnerDashboard } from "../../controller/courtowner/courtowner.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { createCourtSchema, createVenueSchema, deleteVenueSchema, getBookingsSchema, removeCourtSchema, setPricingSchema, updateVenueSchema, getOwnerVenueByIdSchema } from "../../validator/courtowner.validator.js";
import uploadRouter from "../upload/upload.routes.js";

const courtOwnerRouter = Router();

courtOwnerRouter.get("/dashboard", getOwnerDashboard);
courtOwnerRouter.get("/venues", getOnwerVenue);
courtOwnerRouter.get("/venue/:venue_id", validate(getOwnerVenueByIdSchema), getOwnerVenueById);
courtOwnerRouter.post("/create-venue", validate(createVenueSchema), createVenue);
courtOwnerRouter.put("/venue/:venue_id", validate(updateVenueSchema), updateVenue);
courtOwnerRouter.delete("/venue/:venue_id", validate(deleteVenueSchema), deleteVenue);
courtOwnerRouter.post("/venue/:venue_id/pricing", validate(setPricingSchema), setPricing);
courtOwnerRouter.post("/create-court", validate(createCourtSchema), createCourt);
courtOwnerRouter.delete("/remove-court", validate(removeCourtSchema), removeCourt);

courtOwnerRouter.get("/bookings", validate(getBookingsSchema), getBookings);

courtOwnerRouter.use("/upload", uploadRouter);

export default courtOwnerRouter;