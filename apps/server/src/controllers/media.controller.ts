import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { mediaService } from "../services/media.service";

export const mediaController = {
  uploadVideo: async (request: Request, response: Response) => {
    const result = await mediaService.storeVideo(request);
    if ("mediaUrl" in result) return response.status(201).json(result);
    if (result.error === "MEDIA_TOO_LARGE") return sendError(response, 413, "Videos must be 15 MB or smaller.", "VALIDATION_ERROR");
    if (result.error === "EMPTY_MEDIA") return sendError(response, 400, "A video file is required.", "VALIDATION_ERROR");
    return sendError(response, 400, "Use a WebM or MP4 video recording.", "VALIDATION_ERROR");
  },
};
