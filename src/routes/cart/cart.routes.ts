import { Router } from "express";
import { getCart, addToCart, removeFromCart, clearCart, checkout } from "../../controller/cart/cart.controller.js";

const cartRouter = Router();

cartRouter.get("/", getCart);
cartRouter.post("/", addToCart);
cartRouter.delete("/", clearCart);
cartRouter.delete("/:cart_item_id", removeFromCart);
cartRouter.post("/checkout", checkout);

export default cartRouter;