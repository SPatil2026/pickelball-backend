import { Router } from "express";
import { 
    createCourt, 
    createVenue, 
    uplaodVenueImages,
    addMoreVenueImages,
    deleteVenueImage,
    replaceVenueImage,
    setVenueThumbnail
} from "../../controller/courtowner/courtowner.controller.js";
import { verifyToken } from "../../utils/token-manager.js";
import upload from "../../middleware/upload.js";

const courtOwnerRouter = Router();

courtOwnerRouter.post("/create-venue", verifyToken, createVenue);
courtOwnerRouter.post("/create-court", verifyToken, createCourt);
courtOwnerRouter.post("/upload-venue-images", verifyToken, upload.array("images", 5), uplaodVenueImages);

// New Image Management Routes
courtOwnerRouter.post("/venues/:venue_id/images", verifyToken, upload.array("images", 5), addMoreVenueImages);
courtOwnerRouter.delete("/venues/images/:image_id", verifyToken, deleteVenueImage);
courtOwnerRouter.put("/venues/images/:image_id", verifyToken, upload.single("image"), replaceVenueImage);
courtOwnerRouter.put("/venues/images/:image_id/thumbnail", verifyToken, setVenueThumbnail);

export default courtOwnerRouter;