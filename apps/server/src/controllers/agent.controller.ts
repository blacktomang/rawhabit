import type { Request, Response } from "express";
import { sendError } from "../lib/http";
import { habitRepository } from "../repositories/habit.repository";

const outcomes = ["accepted", "dismissed", "unhelpful", "alternative_requested"] as const;

export const agentController = {
  completeActionCard: (request: Request, response: Response) => {
    const card = habitRepository.completeActionCard(request.params.id as string);
    return card ? response.json(card) : sendError(response, 404, "Active action card not found.", "NOT_FOUND");
  },
  feedback: (request: Request, response: Response) => {
    const outcome = request.body?.outcome;
    const action = typeof request.body?.action === "string" ? request.body.action.trim() : "";
    const note = typeof request.body?.note === "string" ? request.body.note.trim().slice(0, 160) : undefined;
    if (!outcomes.includes(outcome) || !action) return sendError(response, 400, "Choose a valid action feedback outcome.", "VALIDATION_ERROR");
    const preference = habitRepository.recordActionFeedback({ action, outcome, note });
    // The next check-in reads this profile before it calls the Coach. Keep the
    // acknowledgement explicit so clients never mistake this for a no-op.
    return response.json({ preference, storedForNextCoachRun: true });
  },
  resolveProposal: (request: Request, response: Response) => {
    const accepted = request.body?.accepted === true;
    const action = habitRepository.resolveAgentAction(request.params.id as string, accepted);
    return action ? response.json(action) : sendError(response, 404, "Agent proposal not found.", "NOT_FOUND");
  },
};
