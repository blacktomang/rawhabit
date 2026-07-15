import type { CheckIn, FeedItem, Visibility } from "@rawhabit/shared";
import { readMediaBody } from "../lib/http";
import { habitRepository } from "../repositories/habit.repository";
import { aiService } from "./ai.service";

export class CheckInService {
  async create(input: { request: Parameters<typeof readMediaBody>[0]; visibility: Visibility; demoTranscript: string }) {
    const template = habitRepository.getActiveTemplate();
    const active = habitRepository.getSession().activeChallenge;
    if (!template || !active || active.status !== "active") return { error: "NO_ACTIVE_CHALLENGE" as const };

    let transcript = input.demoTranscript;
    let transcriptionMode: "live" | "fallback" = transcript ? "fallback" : "live";
    try {
      const media = transcript ? Buffer.alloc(0) : await readMediaBody(input.request);
      if (!transcript && media.length) {
        const transcription = await aiService.transcribe(media, input.request.header("content-type") ?? "audio/webm");
        transcript = transcription.transcript;
        transcriptionMode = transcription.mode;
      }
      if (!transcript) { transcript = "I showed up for today’s check-in and am choosing the next small step."; transcriptionMode = "fallback"; }
    } catch (cause) {
      if (cause instanceof Error && cause.message === "MEDIA_TOO_LARGE") return { error: "MEDIA_TOO_LARGE" as const };
      console.warn("Transcription fallback:", cause);
      transcript = "I had a hard moment today, but I paused and chose to check in.";
      transcriptionMode = "fallback";
    }

    const coaching = await aiService.coach(transcript, template, active.currentDay);
    const checkIn: CheckIn = { id: crypto.randomUUID(), challengeTemplateId: template.id, day: active.currentDay, transcript, caption: coaching.result.caption, visibility: input.visibility, coach: coaching.result, aiRun: { transcription: transcriptionMode, coaching: coaching.mode }, createdAt: new Date().toISOString() };
    habitRepository.addCheckIn(checkIn);
    let feedItem: FeedItem | undefined;
    if (input.visibility === "public") {
      feedItem = { id: crypto.randomUUID(), kind: "daily_log", authorName: habitRepository.getSession().user.displayName, templateId: template.id, challengeTitle: template.title, currentDay: active.currentDay, totalDays: template.totalDays, caption: coaching.result.caption, coachSnippet: coaching.result.coachMessage, createdAt: checkIn.createdAt };
      habitRepository.addFeedItem(feedItem);
    }
    return { checkIn, feedItem };
  }
}

export const checkInService = new CheckInService();
