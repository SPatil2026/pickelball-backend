import express from "express"
import { config } from "dotenv"
import cookieParser from "cookie-parser";
import appRouter from "./routes/index.js";
import cors from "cors";

config(); // Loads .env file automatically
const app = express();

app.use(cors({
    origin: "https://pickelball-app.vercel.app",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET || "pem_jwt")); // enables req.signedCookies

app.use(appRouter);

export default app;