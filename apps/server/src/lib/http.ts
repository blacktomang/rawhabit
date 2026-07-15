import type { Request, Response } from "express";

export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INVALID_STATE" | "PROCESSING_ERROR";

export function sendError(response: Response, status: number, message: string, code: ErrorCode) {
  return response.status(status).json({ error: message, code });
}

export async function readMediaBody(request: Request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (request.body && typeof request.body === "object") return Buffer.alloc(0);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    request.on("data", (chunk: Buffer) => {
      length += chunk.length;
      if (length > 15 * 1024 * 1024) {
        reject(new Error("MEDIA_TOO_LARGE"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.once("end", () => resolve(Buffer.concat(chunks)));
    request.once("error", reject);
  });
}
