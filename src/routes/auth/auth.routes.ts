import { Router } from "express";
import { register, login, logout } from "../../controller/auth/auth.controller.js";
import { verifyToken } from "../../utils/token-manager.js";
import { registerSchema, loginSchema } from "../../validator/auth.validator.js";
import { validate } from "../../middleware/validate.middleware.js";

const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", validate(registerSchema), register);

// POST /api/auth/login
authRouter.post("/login", validate(loginSchema), login);

// POST /api/auth/logout  (protected — must be logged in to log out)
authRouter.post("/logout", verifyToken, logout);

export default authRouter;
