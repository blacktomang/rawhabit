import express from "express";
import { apiRouter } from "./routes/api.routes";
import { uploadsDirectory } from "./services/media.service";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.use((request, response, next) => {
  const requestId = request.header("x-request-id") || crypto.randomUUID();
  response.setHeader("x-request-id", requestId);
  response.on("finish", () => console.info(JSON.stringify({ event: "http_request", requestId, method: request.method, path: request.path, status: response.statusCode })));
  next();
});
app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.use("/uploads", express.static(uploadsDirectory));
app.use("/api", apiRouter);
