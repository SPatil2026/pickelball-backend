import { Router } from "express";
import authRouter from "./auth/auth.routes.js";
import courtOwnerRouter from "./courtowner/courtowner.routes.js";
import { verifyToken } from "../utils/token-manager.js";
import { roleCheck } from "../middleware/roleCheck.js";
import bookerRouter from "./booker/booker.routes.js";
import { Role } from "@prisma/client";

const appRouter = Router();

const publicRoutes = ["/api/auth/login", "/api/auth/register"];

appRouter.use((req, res, next) => {
    if (publicRoutes.includes(req.path)) {
        next();
    }
    else {
        return verifyToken(req, res, next);
    }
})

appRouter.use("/api/auth", authRouter);
appRouter.use("/api/owner", roleCheck(Role.OWNER), courtOwnerRouter);
appRouter.use("/api/booker", roleCheck(Role.BOOKER), bookerRouter);

export default appRouter;
