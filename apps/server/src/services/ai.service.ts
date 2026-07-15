import OpenAI, { toFile } from "openai";
import type { AICoachResponse, ChallengeTemplate } from "@rawhabit/shared";
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

  async coach(transcript: string, template: ChallengeTemplate, day: number) {
    if (!this.client) return { result: this.fallbackCoach(transcript, template), mode: "fallback" as const };
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a concise, empathetic habit coach. Return JSON only with riskLevel (low, medium, high, or critical), caption under 140 characters, coachMessage, and suggestedAction. Give one practical action compatible with the strategy rules. Do not diagnose or prescribe treatment. For high/critical risk, compassionately encourage trusted or local emergency/crisis support if immediate danger is possible." },
          { role: "user", content: JSON.stringify({ transcript, challenge: template.title, day, totalDays: template.totalDays, strategyRules: template.strategyRules }) },
        ],
      });
      const result = JSON.parse(completion.choices[0]?.message.content ?? "{}") as Partial<AICoachResponse>;
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
