import express from "express";
import { apiRouter } from "./routes/api.routes";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api", apiRouter);
