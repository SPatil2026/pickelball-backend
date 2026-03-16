import express from "express"
import { config } from "dotenv"
import cookieParser from "cookie-parser";
import appRouter from "./routes/index.js";

config(); // Loads .env file automatically
const app = express();

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET || "pem_jwt")); // enables req.signedCookies

app.use(appRouter);

export default app;