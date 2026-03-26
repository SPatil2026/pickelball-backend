import { Router } from "express";
import { getCart, addToCart, removeFromCart, clearCart, checkout } from "../../controller/cart/cart.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { addToCartSchema, removeFromCartSchema } from "../../validator/cart.validator.js";

const cartRouter = Router();

cartRouter.get("/", getCart);
cartRouter.post("/", validate(addToCartSchema), addToCart);
cartRouter.post("/checkout", checkout);
cartRouter.delete("/clear-all", clearCart);
cartRouter.delete("/:cart_item_id", validate(removeFromCartSchema), removeFromCart);

export default cartRouter;