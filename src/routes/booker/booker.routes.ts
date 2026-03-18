import { Router } from "express";
import { getAvailableSlots, getVenue, addToCart, getCart, removeFromCart, checkout } from "../../controller/booker/booker.controller.js";
import { verifyToken } from "../../utils/token-manager.js";

const bookerRouter = Router();

bookerRouter.get("/venues", verifyToken, getVenue);
bookerRouter.get("/available-slots", verifyToken, getAvailableSlots);

bookerRouter.get("/cart", verifyToken, getCart);
bookerRouter.post("/cart", verifyToken, addToCart);
bookerRouter.delete("/cart/:cart_item_id", verifyToken, removeFromCart);

bookerRouter.post("/checkout", verifyToken, checkout);

export default bookerRouter;