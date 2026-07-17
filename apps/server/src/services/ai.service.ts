import OpenAI, { toFile } from "openai";
import type { AICoachResponse, AgentPreference, ChallengeTemplate } from "@rawhabit/shared";
import { env } from "../config/env";

export type AiMode = "live" | "fallback";

export class AiService {
  private client = process.env.OPENAI_API_KEY ? new OpenAI() : undefined;

  async transcribe(body: Buffer, contentType: string) {
    if (!this.client) return { transcript: "I felt a craving today, but I paused and chose to check in instead.", mode: "fallback" as const };
    const extension = contentType.includes("mp4") ? "mp4" : "webm";
    const file = await toFile(body, `rawhabit-checkin.${extension}`, { type: contentType });
    const result = await this.client.audio.transcriptions.create({ file, model: env.transcriptionModel });
    if (!result.text.trim()) throw new Error("Empty transcript");
    return { transcript: result.text.trim(), mode: "live" as const };
  }

  async coach(transcript: string, template: ChallengeTemplate, day: number, preferences: AgentPreference) {
    if (!this.client) return { result: this.fallbackCoach(transcript, template), mode: "fallback" as const };
    try {
      const response = await this.client.responses.create({
        model: env.coachingModel,
        instructions: "You are RawHabit's concise, empathetic Accountability Agent. First privately assess friction and risk. Then give exactly one practical, strategy-compatible action. Never diagnose, prescribe treatment, or claim emergency detection. For high or critical language, compassionately encourage a trusted person or local emergency/crisis support if immediate danger is possible.",
        input: JSON.stringify({ transcript, challenge: template.title, day, totalDays: template.totalDays, strategyRules: template.strategyRules, explicitUserPreferences: preferences }),
        text: { format: { type: "json_schema", name: "rawhabit_coach_response", strict: true, schema: { type: "object", additionalProperties: false, properties: { riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] }, caption: { type: "string" }, coachMessage: { type: "string" }, suggestedAction: { type: "string" } }, required: ["riskLevel", "caption", "coachMessage", "suggestedAction"] } },
      });
      const result = JSON.parse(response.output_text || "{}") as Partial<AICoachResponse>;
      if (!["low", "medium", "high", "critical"].includes(result.riskLevel ?? "") || !result.caption || !result.coachMessage) throw new Error("Invalid coach response");
      return { result: { riskLevel: result.riskLevel as AICoachResponse["riskLevel"], caption: result.caption.slice(0, 140), coachMessage: result.coachMessage, suggestedAction: result.suggestedAction || template.strategyRules[0] }, mode: "live" as const };
    } catch (cause) {
      console.warn("Coach fallback:", cause);
      return { result: this.fallbackCoach(transcript, template), mode: "fallback" as const };
    }
  }

  private fallbackCoach(transcript: string, template: ChallengeTemplate): AICoachResponse {
    return { riskLevel: "low", caption: transcript.slice(0, 135) || "An honest check-in, one day at a time.", coachMessage: "You showed up for the hard moment. Keep your next step small and specific.", suggestedAction: template.strategyRules[0] };
  }
}

export const aiService = new AiService();
