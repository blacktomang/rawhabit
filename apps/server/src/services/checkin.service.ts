import type { ActionCard, AgentAction, CheckIn, FeedItem, Visibility } from "@rawhabit/shared";
import { readMediaBody } from "../lib/http";
import { habitRepository } from "../repositories/habit.repository";
import { aiService } from "./ai.service";

export class CheckInService {
  async create(input: { request: Parameters<typeof readMediaBody>[0]; visibility: Visibility; demoTranscript: string; mediaUrl?: string }) {
    const media = input.demoTranscript ? Buffer.alloc(0) : await readMediaBody(input.request);
    return this.process({ media, contentType: input.request.header("content-type") ?? "audio/webm", visibility: input.visibility, demoTranscript: input.demoTranscript, mediaUrl: input.mediaUrl });
  }

  async process(input: { media: Buffer; contentType: string; visibility: Visibility; demoTranscript: string; mediaUrl?: string; onProgress?: (event: "transcript_ready" | "coach_ready" | "action_card_ready", data?: Record<string, unknown>) => void }) {
    const template = habitRepository.getActiveTemplate();
    const active = habitRepository.getSession().activeChallenge;
    if (!template || !active || active.status !== "active") return { error: "NO_ACTIVE_CHALLENGE" as const };

    let transcript = input.demoTranscript;
    let transcriptionMode: "live" | "fallback" = transcript ? "fallback" : "live";
    try {
      if (!transcript && input.media.length) {
        const transcription = await aiService.transcribe(input.media, input.contentType);
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

    input.onProgress?.("transcript_ready", { transcriptMode: transcriptionMode });
    const coaching = await aiService.coach(transcript, template, active.currentDay, habitRepository.getPreference(), habitRepository.getSession().habitProtocol);
    input.onProgress?.("coach_ready", { coachingMode: coaching.mode });
    const checkIn: CheckIn = { id: crypto.randomUUID(), challengeTemplateId: template.id, day: active.currentDay, transcript, caption: coaching.result.caption, visibility: input.visibility, mediaUrl: input.mediaUrl, coach: coaching.result, assessment: coaching.assessment, coachPlan: coaching.plan, aiRun: { transcription: transcriptionMode, coaching: coaching.mode }, createdAt: new Date().toISOString() };
    habitRepository.addCheckIn(checkIn);
    const actionCard: ActionCard = { id: crypto.randomUUID(), checkInId: checkIn.id, title: "Your next small step", instruction: coaching.result.suggestedAction ?? template.strategyRules[0], expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: "active" };
    habitRepository.setActionCard(actionCard);
    const proposedKind = coaching.assessment.recommendedIntervention === "protocol_change" ? "mutate_challenge_protocol" : coaching.assessment.recommendedIntervention === "support_prompt" ? "request_encouragement" : null;
    if (proposedKind) {
      const proposal: AgentAction = { id: crypto.randomUUID(), checkInId: checkIn.id, kind: proposedKind, status: "awaiting_confirmation", proposedPayload: proposedKind === "mutate_challenge_protocol" ? { message: "Review and adjust your Habit Protocol before the next check-in." } : { message: "Ask the community for generic encouragement on your safe progress card." }, createdAt: new Date().toISOString() };
      habitRepository.proposeAgentAction(proposal);
    }
    input.onProgress?.("action_card_ready", { actionCardId: actionCard.id });
    let feedItem: FeedItem | undefined;
    if (input.visibility === "public") {
      feedItem = { id: crypto.randomUUID(), kind: "daily_log", authorName: habitRepository.getSession().user.displayName, templateId: template.id, challengeTitle: template.title, currentDay: active.currentDay, totalDays: template.totalDays, caption: coaching.result.caption, coachSnippet: coaching.result.coachMessage, mediaUrl: input.mediaUrl, createdAt: checkIn.createdAt };
      habitRepository.addFeedItem(feedItem);
    }
    return { checkIn, feedItem, actionCard };
  }

  publish(checkInId: string) {
    const checkIn = habitRepository.findCheckIn(checkInId);
    const template = checkIn && habitRepository.findTemplate(checkIn.challengeTemplateId);
    if (!checkIn || !template) return null;
    const existing = habitRepository.getFeed().find((item) => item.id === `checkin-${checkIn.id}`);
    if (existing) return existing;
    const item: FeedItem = { id: `checkin-${checkIn.id}`, kind: "daily_log", authorName: habitRepository.getSession().user.displayName, templateId: template.id, challengeTitle: template.title, currentDay: checkIn.day, totalDays: template.totalDays, caption: checkIn.caption, coachSnippet: checkIn.coach.coachMessage, initiatedBy: habitRepository.getSession().activeChallenge?.initiatedBy, createdAt: new Date().toISOString() };
    habitRepository.addFeedItem(item);
    return item;
  }
}

export const checkInService = new CheckInService();
