import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { challengeService } from "../services/challenge.service";

export const challengeController = {
  listTemplates: (_request: Request, response: Response) => response.json(challengeService.listTemplates()),
  getSession: (_request: Request, response: Response) => response.json(challengeService.getSession()),
  getFeed: (_request: Request, response: Response) => response.json(challengeService.getFeed()),
  getCommunity: (request: Request, response: Response) => {
    const community = challengeService.getCommunity(request.params.templateId);
    return community ? response.json(community) : sendError(response, 404, "Challenge template not found.", "NOT_FOUND");
  },
  listCommunityParticipants: (request: Request, response: Response) => {
    const participants = challengeService.listCommunityParticipants(request.params.templateId);
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
    const session = challengeService.cloneFromFeed(request.params.feedItemId);
    return session ? response.json(session) : sendError(response, 404, "Public challenge post not found.", "NOT_FOUND");
  },
};
