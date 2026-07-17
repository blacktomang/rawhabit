import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { graduationService } from "../services/graduation.service";

export const graduationController = {
  complete: (_request: Request, response: Response) => {
    const result = graduationService.complete();
    if ("error" in result) {
      if (result.error === "DEV_CHEAT_DISABLED") return sendError(response, 403, "Dev completion is disabled.", "INVALID_STATE");
      return sendError(response, 409, "Start a challenge before completing it.", "INVALID_STATE");
    }
    return response.json(result.session);
  },
  report: async (_request: Request, response: Response) => {
    const report = await graduationService.createReport();
    return report ? response.json(report) : sendError(response, 409, "Graduate status is required.", "INVALID_STATE");
  },
  publish: (request: Request, response: Response) => {
    const caption = typeof request.body?.caption === "string" ? request.body.caption.trim() : "";
    const result = graduationService.publish(caption);
    if ("error" in result) {
      if (result.error === "NOT_A_GRADUATE") return sendError(response, 409, "Graduate status is required.", "INVALID_STATE");
      return sendError(response, 400, "Victory post must be between 1 and 500 characters.", "VALIDATION_ERROR");
    }
    return response.json(result.item);
  },
};
