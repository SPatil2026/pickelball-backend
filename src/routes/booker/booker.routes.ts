import { Router } from "express";
import { getAvailableSlots, getVenue } from "../../controller/booker/booker.controller.js";
import { verifyToken } from "../../utils/token-manager.js";

const bookerRouter = Router();

bookerRouter.get("/venues", verifyToken, getVenue);
bookerRouter.get("/available-slots", verifyToken, getAvailableSlots);

export default bookerRouter;