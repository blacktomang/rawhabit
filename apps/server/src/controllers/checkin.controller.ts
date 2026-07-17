import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { checkInService } from "../services/checkin.service";

export const checkInController = {
  create: async (request: Request, response: Response) => {
    const visibility = request.query.visibility === "public" ? "public" : "private";
    const demoTranscript = typeof request.query.demoTranscript === "string" ? request.query.demoTranscript.trim() : "";
    const mediaUrl = typeof request.query.mediaUrl === "string" && request.query.mediaUrl.startsWith("/uploads/") ? request.query.mediaUrl : undefined;
    const result = await checkInService.create({ request, visibility, demoTranscript, mediaUrl });
    if ("error" in result) {
      if (result.error === "NO_ACTIVE_CHALLENGE") return sendError(response, 409, "Start a challenge before adding a check-in.", "INVALID_STATE");
      return sendError(response, 413, "Recordings must be 15 MB or smaller.", "VALIDATION_ERROR");
    }
    return response.json(result);
  },
};
