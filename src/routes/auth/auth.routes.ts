import { Router } from "express";
import { register, login, logout } from "../../controller/auth/auth.controller.js";
import { verifyToken } from "../../utils/token-manager.js";

const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", register);

// POST /api/auth/login
authRouter.post("/login", login);

// POST /api/auth/logout  (protected — must be logged in to log out)
authRouter.post("/logout", verifyToken, logout);

export default authRouter;
