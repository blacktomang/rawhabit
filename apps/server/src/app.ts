import express from "express";
import { apiRouter } from "./routes/api.routes";
import { uploadsDirectory } from "./services/media.service";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.use("/uploads", express.static(uploadsDirectory));
app.use("/api", apiRouter);
