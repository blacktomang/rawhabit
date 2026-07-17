import type { FeedItem, TransformationReport } from "@rawhabit/shared";
import { env } from "../config/env";
import { habitRepository } from "../repositories/habit.repository";
import { aiService } from "./ai.service";

export class GraduationService {
  complete() {
    const template = habitRepository.getActiveTemplate();
    if (!template || !habitRepository.getSession().activeChallenge) return { error: "NO_ACTIVE_CHALLENGE" as const };
    if (!env.allowDevCheat) return { error: "DEV_CHEAT_DISABLED" as const };
    return { session: habitRepository.completeChallenge(template.totalDays)! };
  }
  async createReport() {
    const template = habitRepository.getActiveTemplate();
    if (!template || habitRepository.getSession().user.status !== "graduate") return null;
    const report = await aiService.transformationReport({ title: template.title, totalDays: template.totalDays, checkIns: habitRepository.listCheckIns().map((checkIn) => ({ caption: checkIn.caption, coachMessage: checkIn.coach.coachMessage })) });
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
