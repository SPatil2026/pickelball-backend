import { Router } from "express";
import { createCourt, createVenue, getBookings, removeCourt, updateVenue, setPricing } from "../../controller/courtowner/courtowner.controller.js";
import { verifyToken } from "../../utils/token-manager.js";

const courtOwnerRouter = Router();

courtOwnerRouter.post("/create-venue", verifyToken, createVenue);
courtOwnerRouter.put("/venue/:venue_id", verifyToken, updateVenue);
courtOwnerRouter.post("/venue/:venue_id/pricing", verifyToken, setPricing);
courtOwnerRouter.post("/create-court", verifyToken, createCourt);
courtOwnerRouter.delete("/remove-court", verifyToken, removeCourt);

courtOwnerRouter.get("/bookings", verifyToken, getBookings);

export default courtOwnerRouter;