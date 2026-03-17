import { Router } from "express";
import { createCourt, createVenue } from "../../controller/courtowner/courtowner.controller.js";
import { verifyToken } from "../../utils/token-manager.js";

const courtOwnerRouter = Router();

courtOwnerRouter.post("/create-venue", verifyToken, createVenue);
courtOwnerRouter.post("/create-court", verifyToken, createCourt);

export default courtOwnerRouter;