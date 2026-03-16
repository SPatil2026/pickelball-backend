import { Router } from "express";
import authRouter from "./auth/auth.routes.js";

const appRouter = Router();

appRouter.use("/api/auth", authRouter);

export default appRouter;
