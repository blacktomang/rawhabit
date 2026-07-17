import OpenAI, { toFile } from "openai";
import type {
  AICoachResponse,
  AgentPreference,
  ChallengeTemplate,
  HabitProtocol,
  SaboteurAssessment,
  CoachPlan,
  TransformationReport,
} from "@rawhabit/shared";
import { env } from "../config/env";

export type AiMode = "live" | "fallback";
export interface CoachingRun {
  result: AICoachResponse;
  assessment: SaboteurAssessment;
  plan: CoachPlan;
  mode: AiMode;
}

export class AiService {
  private client = process.env.OPENAI_API_KEY ? new OpenAI() : undefined;

  async transcribe(body: Buffer, contentType: string) {
    if (!this.client)
      return {
        transcript:
          "I felt a craving today, but I paused and chose to check in instead.",
        mode: "fallback" as const,
      };
    const extension = contentType.includes("mp4") ? "mp4" : "webm";
    const file = await toFile(body, `rawhabit-checkin.${extension}`, {
      type: contentType,
    });
    const result = await this.client.audio.transcriptions.create({
      file,
      model: env.transcriptionModel,
    });
    if (!result.text.trim()) throw new Error("Empty transcript");
    return { transcript: result.text.trim(), mode: "live" as const };
  }

  async coach(
    transcript: string,
    template: ChallengeTemplate,
    day: number,
    preferences: AgentPreference,
    habitProtocol: HabitProtocol | null,
  ) {
    if (!this.client) return this.fallbackCoach(transcript, template);
    try {
      const response = await this.client.responses.create({
        model: env.coachingModel,
        instructions:
          "You are RawHabit's concise, empathetic Accountability Agent. First privately assess friction and risk. Then give exactly one practical, strategy-compatible action. Never diagnose, prescribe treatment, or claim emergency detection. For high or critical language, compassionately encourage a trusted person or local emergency/crisis support if immediate danger is possible.",
        input: JSON.stringify({
          transcript,
          challenge: template.title,
          day,
          totalDays: template.totalDays,
          strategyRules: template.strategyRules,
          habitProtocol,
          explicitUserPreferences: preferences,
        }),
        text: {
          format: {
            type: "json_schema",
            name: "rawhabit_coach_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                assessment: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    frictionPatterns: { type: "array", items: { type: "string" } },
                    evidence: { type: "array", items: { type: "string" } },
                    recommendedIntervention: { type: "string", enum: ["coach", "action_card", "protocol_change", "support_prompt"] },
                  },
                  required: ["riskLevel", "frictionPatterns", "evidence", "recommendedIntervention"],
                },
                plan: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    caption: { type: "string" },
                    socraticPrompt: { type: "string" },
                    suggestedAction: { type: "string" },
                    supportMessage: { type: "string" },
                  },
                  required: ["caption", "socraticPrompt", "suggestedAction", "supportMessage"],
                },
              },
              required: ["assessment", "plan"],
            },
          },
        },
      });
      return this.validateCoachRun(JSON.parse(response.output_text || "{}"), "live");
    } catch (cause) {
      console.warn("Coach fallback:", cause);
      return {
        ...this.fallbackCoach(transcript, template),
      };
    }
  }

  async transformationReport(input: { title: string; totalDays: number; checkIns: Array<{ caption: string; coachMessage: string }> }): Promise<TransformationReport> {
    const fallback = this.fallbackReport(input.title, input.totalDays);
    if (!this.client) return fallback;
    try {
      const response = await this.client.responses.create({
        model: env.coachingModel,
        instructions: "Write a warm, non-clinical habit reflection. Do not diagnose, make medical claims, or invent achievements. Keep every field concise; the combined report must stay under 180 words.",
        input: JSON.stringify({ challengeTitle: input.title, totalDays: input.totalDays, checkInSummaries: input.checkIns.slice(0, 30) }),
        text: { format: { type: "json_schema", name: "rawhabit_transformation_report", strict: true, schema: { type: "object", additionalProperties: false, properties: { themes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 }, strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 }, carryForward: { type: "string" } }, required: ["themes", "strengths", "carryForward"] } } },
      });
      const data = JSON.parse(response.output_text || "{}") as Partial<Pick<TransformationReport, "themes" | "strengths" | "carryForward">>;
      if (!this.isStringList(data.themes) || !this.isStringList(data.strengths) || !this.isText(data.carryForward)) throw new Error("Invalid transformation report");
      const report: TransformationReport = { challengeTitle: input.title, totalDays: input.totalDays, themes: data.themes.slice(0, 3).map((item) => item.slice(0, 180)), strengths: data.strengths.slice(0, 3).map((item) => item.slice(0, 180)), carryForward: data.carryForward.slice(0, 220), generatedAt: new Date().toISOString() };
      return this.wordCount(report) <= 180 ? report : fallback;
    } catch (cause) {
      console.warn("Transformation report fallback:", cause);
      return fallback;
    }
  }

  private validateCoachRun(value: unknown, mode: AiMode): CoachingRun {
    if (!value || typeof value !== "object") throw new Error("Invalid coach response");
    const { assessment, plan } = value as { assessment?: Partial<SaboteurAssessment>; plan?: Partial<CoachPlan> };
    const validRisk = ["low", "medium", "high", "critical"];
    const validInterventions = ["coach", "action_card", "protocol_change", "support_prompt"];
    if (!assessment || !plan || !validRisk.includes(assessment.riskLevel ?? "") || !validInterventions.includes(assessment.recommendedIntervention ?? "") || !this.isStringList(assessment.frictionPatterns) || !this.isStringList(assessment.evidence) || !this.isText(plan.caption) || !this.isText(plan.socraticPrompt) || !this.isText(plan.suggestedAction) || !this.isText(plan.supportMessage)) throw new Error("Invalid coach response");
    const safeAssessment: SaboteurAssessment = { riskLevel: assessment.riskLevel as SaboteurAssessment["riskLevel"], frictionPatterns: assessment.frictionPatterns.slice(0, 4), evidence: assessment.evidence.slice(0, 4), recommendedIntervention: assessment.recommendedIntervention as SaboteurAssessment["recommendedIntervention"] };
    const safePlan: CoachPlan = { caption: plan.caption.slice(0, 140), socraticPrompt: plan.socraticPrompt.slice(0, 240), suggestedAction: plan.suggestedAction.slice(0, 240), supportMessage: plan.supportMessage.slice(0, 280) };
    return { assessment: safeAssessment, plan: safePlan, result: { riskLevel: safeAssessment.riskLevel, caption: safePlan.caption, coachMessage: safePlan.supportMessage ?? safePlan.socraticPrompt, suggestedAction: safePlan.suggestedAction }, mode };
  }

  private isText(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
  private isStringList(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => this.isText(item)); }
  private wordCount(report: Pick<TransformationReport, "themes" | "strengths" | "carryForward">) { return [...report.themes, ...report.strengths, report.carryForward].join(" ").trim().split(/\s+/).filter(Boolean).length; }

  private fallbackReport(title: string, totalDays: number): TransformationReport {
    return { challengeTitle: title, totalDays, themes: ["You made space for honest check-ins.", "You practiced choosing a pause before the old pattern."], strengths: ["Consistency through hard moments", "Using your backup strategy"], carryForward: "Keep the next step small, visible, and easy to begin.", generatedAt: new Date().toISOString() };
  }

  private fallbackCoach(
    transcript: string,
    template: ChallengeTemplate,
  ): CoachingRun {
    const plan: CoachPlan = { caption: transcript.slice(0, 135) || "An honest check-in, one day at a time.", socraticPrompt: "What would make the next small step easier to start?", supportMessage: "You showed up for the hard moment. Keep your next step small and specific.", suggestedAction: template.strategyRules[0] };
    const assessment: SaboteurAssessment = { riskLevel: "low", frictionPatterns: ["A difficult moment was named without a specific barrier."], evidence: [transcript.slice(0, 160) || "User completed a check-in."], recommendedIntervention: "action_card" };
    return { assessment, plan, result: { riskLevel: assessment.riskLevel, caption: plan.caption, coachMessage: plan.supportMessage ?? plan.socraticPrompt, suggestedAction: plan.suggestedAction }, mode: "fallback" };
  }
}

export const aiService = new AiService();
