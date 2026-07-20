import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { challengeService } from "../services/challenge.service";

export const challengeController = {
  listTemplates: (_request: Request, response: Response) => response.json(challengeService.listTemplates()),
  getSession: (_request: Request, response: Response) => response.json(challengeService.getSession()),
  getFeed: (_request: Request, response: Response) => response.json(challengeService.getFeed()),
  getCommunity: (request: Request, response: Response) => {
    const templateId = typeof request.params.templateId === "string" ? request.params.templateId : "";
    const community = challengeService.getCommunity(templateId);
    return community ? response.json(community) : sendError(response, 404, "Challenge template not found.", "NOT_FOUND");
  },
  listCommunityParticipants: (request: Request, response: Response) => {
    const templateId = typeof request.params.templateId === "string" ? request.params.templateId : "";
    const participants = challengeService.listCommunityParticipants(templateId);
    return participants ? response.json(participants) : sendError(response, 404, "Challenge template not found.", "NOT_FOUND");
  },
  start: (request: Request, response: Response) => {
    const session = challengeService.start(request.body?.templateId);
    return session ? response.json(session) : sendError(response, 404, "Challenge template not found.", "NOT_FOUND");
  },
  clone: (request: Request, response: Response) => {
    const templateId = typeof request.params.templateId === "string" ? request.params.templateId : "";
    const session = challengeService.start(templateId);
    return session ? response.json(session) : sendError(response, 404, "Challenge template not found.", "NOT_FOUND");
  },
  cloneFromFeed: (request: Request, response: Response) => {
    const feedItemId = typeof request.params.feedItemId === "string" ? request.params.feedItemId : "";
    const session = challengeService.cloneFromFeed(feedItemId);
    return session ? response.json(session) : sendError(response, 404, "Public challenge post not found.", "NOT_FOUND");
  },
  saveProtocol: (request: Request, response: Response) => {
    const trigger = typeof request.body?.trigger === "string" ? request.body.trigger.trim() : "";
    const environmentChange = typeof request.body?.environmentChange === "string" ? request.body.environmentChange.trim() : "";
    const minimumAction = typeof request.body?.minimumAction === "string" ? request.body.minimumAction.trim() : "";
    if (!trigger || !environmentChange || !minimumAction) return sendError(response, 400, "Complete all Habit Protocol questions.", "VALIDATION_ERROR");
    const protocol = challengeService.saveProtocol({ trigger: trigger.slice(0, 160), environmentChange: environmentChange.slice(0, 160), minimumAction: minimumAction.slice(0, 160) });
    return protocol ? response.json(protocol) : sendError(response, 409, "Start a challenge before saving a Habit Protocol.", "INVALID_STATE");
  },
  advanceDay: (_request: Request, response: Response) => {
    const result = challengeService.advanceDay();
    if ("error" in result) return sendError(response, 409, result.error === "CHECK_IN_REQUIRED" ? "Finish today’s private check-in before advancing the challenge date." : "Start an active challenge before advancing.", "INVALID_STATE");
    return response.json(result.session);
  },
  listJourney: (_request: Request, response: Response) => response.json(challengeService.listJourney()),
};
