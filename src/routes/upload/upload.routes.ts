import { Router } from "express";
import upload from "../../middleware/upload.js";
import { deleteVenueImage, getVenueImages, replaceVenueImage, setVenueThumbnail, uplaodVenueImages } from "../../controller/upload/upload.controller.js";

const uploadRouter = Router();

uploadRouter.get("/venue-images/:venue_id", getVenueImages);
uploadRouter.post("/venue-images", upload.array("images", 5), uplaodVenueImages);
uploadRouter.delete("/venue-images/:image_id", deleteVenueImage);
uploadRouter.put("/venues/images/:image_id", upload.single("image"), replaceVenueImage);
uploadRouter.put("/venues/images/:image_id/thumbnail", setVenueThumbnail);


export default uploadRouter;