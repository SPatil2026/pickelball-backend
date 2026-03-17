import { Router } from "express";
import authRouter from "./auth/auth.routes.js";
import courtOwnerRouter from "./courtowner/courtowner.routes.js";
import { verifyToken } from "../utils/token-manager.js";
import { roleCheck } from "../middleware/roleCheck.js";

const appRouter = Router();

appRouter.use("/api/auth", authRouter);
appRouter.use("/api/owner", verifyToken, roleCheck("OWNER"), courtOwnerRouter);

export default appRouter;
