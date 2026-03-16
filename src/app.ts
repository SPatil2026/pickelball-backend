import express from "express"
import { config } from "dotenv"
import appRouter from "./routes/index.js";

config(); // Loads .env file automatically
const app = express();

app.use(express.json());

app.use(appRouter);

export default app;