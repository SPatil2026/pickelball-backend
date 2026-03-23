import { Router } from "express";
import { createCourt, createVenue, getBookings, removeCourt, updateVenue, setPricing, deleteVenue } from "../../controller/courtowner/courtowner.controller.js";

const courtOwnerRouter = Router();

courtOwnerRouter.post("/create-venue", createVenue);
courtOwnerRouter.put("/venue/:venue_id", updateVenue);
courtOwnerRouter.delete("/venue/:venue_id", deleteVenue);
courtOwnerRouter.post("/venue/:venue_id/pricing", setPricing);
courtOwnerRouter.post("/create-court", createCourt);
courtOwnerRouter.delete("/remove-court", removeCourt);

courtOwnerRouter.get("/bookings", getBookings);

export default courtOwnerRouter;