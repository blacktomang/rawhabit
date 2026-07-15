/** The likelihood that a check-in needs additional support or urgent action. */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Client payload representing one daily, raw check-in. */
export interface CheckInPayload {
  goalId: string;
  day: number;
  transcript: string;
  durationSeconds?: number;
  isPublic?: boolean;
}

/** Structured result returned by the AI coaching pipeline. */
export interface AICoachResponse {
  riskLevel: RiskLevel;
  caption: string;
  coachMessage: string;
  suggestedAction?: string;
}

export type ChallengeStatus = "active" | "completed";
export type Visibility = "private" | "public";
export type FeedItemKind = "daily_log" | "graduate_post";

export interface ChallengeTemplate {
  id: string;
  title: string;
  totalDays: number;
  description: string;
  strategyRules: string[];
}

export interface ActiveChallenge {
  templateId: string;
  currentDay: number;
  status: ChallengeStatus;
  startedAt: string;
}

export interface CheckIn {
  id: string;
  challengeTemplateId: string;
  day: number;
  transcript: string;
  caption: string;
  visibility: Visibility;
  coach: AICoachResponse;
  aiRun: {
    transcription: "live" | "fallback";
    coaching: "live" | "fallback";
  };
  createdAt: string;
}

export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  authorName: string;
  templateId?: string;
  challengeTitle: string;
  currentDay?: number;
  totalDays?: number;
  caption: string;
  coachSnippet?: string;
  createdAt: string;
}

export interface TransformationReport {
  challengeTitle: string;
  totalDays: number;
  themes: string[];
  strengths: string[];
  carryForward: string;
  generatedAt: string;
}

export interface SessionState {
  user: { displayName: string; status: "challenger" | "graduate" };
  activeChallenge: ActiveChallenge | null;
  report: TransformationReport | null;
}
