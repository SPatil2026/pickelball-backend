import { Router } from "express";
import { createCourt, createVenue, uplaodVenueImages } from "../../controller/courtowner/courtowner.controller.js";
import { verifyToken } from "../../utils/token-manager.js";
import upload from "../../middleware/upload.js";

const courtOwnerRouter = Router();

courtOwnerRouter.post("/create-venue", verifyToken, createVenue);
courtOwnerRouter.post("/create-court", verifyToken, createCourt);
courtOwnerRouter.post("/upload-venue-images", upload.array("images", 5), verifyToken, uplaodVenueImages);

export default courtOwnerRouter;