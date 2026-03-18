import { Router } from "express";
import { createCourt, createVenue, getBookings, removeCourt } from "../../controller/courtowner/courtowner.controller.js";
import { verifyToken } from "../../utils/token-manager.js";

const courtOwnerRouter = Router();

courtOwnerRouter.post("/create-venue", verifyToken, createVenue);
courtOwnerRouter.post("/create-court", verifyToken, createCourt);
courtOwnerRouter.delete("/remove-court", verifyToken, removeCourt);

courtOwnerRouter.get("/bookings", verifyToken, getBookings);

export default courtOwnerRouter;