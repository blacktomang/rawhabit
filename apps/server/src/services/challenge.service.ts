import { habitRepository } from "../repositories/habit.repository";

export class ChallengeService {
  listTemplates() { return habitRepository.listTemplates(); }
  getSession() { return habitRepository.getSession(); }
  getFeed() { return habitRepository.getFeed(); }
  getCommunity(templateId: string) {
    return habitRepository.findTemplate(templateId) ? habitRepository.getCommunity(templateId) : null;
  }
  listCommunityParticipants(templateId: string) {
    return habitRepository.findTemplate(templateId) ? habitRepository.listCommunityParticipants(templateId) : null;
  }
  start(templateId: string) {
    const template = habitRepository.findTemplate(templateId);
    return template ? habitRepository.startChallenge(template) : null;
  }
  cloneFromFeed(feedItemId: string) {
    const source = habitRepository.findFeedItem(feedItemId);
    const template = source?.templateId && habitRepository.findTemplate(source.templateId);
    if (!source || !template) return null;
    return habitRepository.startChallenge(template, { sourceFeedItemId: source.id, displayName: source.authorName, challengeTitle: source.challengeTitle, clonedAt: new Date().toISOString() });
  }
}

export const challengeService = new ChallengeService();
