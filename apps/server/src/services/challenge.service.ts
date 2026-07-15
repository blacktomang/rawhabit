import { habitRepository } from "../repositories/habit.repository";

export class ChallengeService {
  listTemplates() { return habitRepository.listTemplates(); }
  getSession() { return habitRepository.getSession(); }
  getFeed() { return habitRepository.getFeed(); }
  start(templateId: string) {
    const template = habitRepository.findTemplate(templateId);
    return template ? habitRepository.startChallenge(template) : null;
  }
}

export const challengeService = new ChallengeService();
