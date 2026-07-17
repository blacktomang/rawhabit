import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { habitRepository } from "../repositories/habit.repository";

const outcomes = ["accepted", "dismissed", "unhelpful", "alternative_requested"] as const;

export const agentController = {
  completeActionCard: (request: Request, response: Response) => {
    const card = habitRepository.completeActionCard(request.params.id);
    return card ? response.json(card) : sendError(response, 404, "Active action card not found.", "NOT_FOUND");
  },
  feedback: (request: Request, response: Response) => {
    const outcome = request.body?.outcome;
    const action = typeof request.body?.action === "string" ? request.body.action.trim() : "";
    const note = typeof request.body?.note === "string" ? request.body.note.trim().slice(0, 160) : undefined;
    if (!outcomes.includes(outcome) || !action) return sendError(response, 400, "Choose a valid action feedback outcome.", "VALIDATION_ERROR");
    const preference = habitRepository.recordActionFeedback({ action, outcome, note });
    return response.json(preference);
  },
};
