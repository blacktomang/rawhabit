import type { FeedItem, TransformationReport } from "@rawhabit/shared";
import { env } from "../config/env";
import { habitRepository } from "../repositories/habit.repository";

export class GraduationService {
  complete() {
    const template = habitRepository.getActiveTemplate();
    if (!template || !habitRepository.getSession().activeChallenge) return { error: "NO_ACTIVE_CHALLENGE" as const };
    if (!env.allowDevCheat) return { error: "DEV_CHEAT_DISABLED" as const };
    return { session: habitRepository.completeChallenge(template.totalDays)! };
  }
  createReport() {
    const template = habitRepository.getActiveTemplate();
    if (!template || habitRepository.getSession().user.status !== "graduate") return null;
    const report: TransformationReport = { challengeTitle: template.title, totalDays: template.totalDays, themes: ["You made space for honest check-ins.", "You practiced choosing a pause before the old pattern."], strengths: ["Consistency through hard moments", "Using your backup strategy"], carryForward: template.strategyRules[0], generatedAt: new Date().toISOString() };
    return habitRepository.saveReport(report);
  }
  publish(caption: string) {
    const template = habitRepository.getActiveTemplate();
    const session = habitRepository.getSession();
    if (!template || session.user.status !== "graduate") return { error: "NOT_A_GRADUATE" as const };
    if (!caption || caption.length > 500) return { error: "INVALID_CAPTION" as const };
    const item: FeedItem = { id: crypto.randomUUID(), kind: "graduate_post", authorName: session.user.displayName, challengeTitle: `${template.title} Graduate`, caption, createdAt: new Date().toISOString() };
    habitRepository.addFeedItem(item);
    return { item };
  }
}

export const graduationService = new GraduationService();
