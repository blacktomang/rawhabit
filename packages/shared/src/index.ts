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
export type AgentActionKind = "inject_action_card" | "mutate_challenge_protocol" | "request_encouragement";
export type AgentActionStatus = "proposed" | "awaiting_confirmation" | "executed" | "rejected" | "expired";

export interface ChallengeTemplate {
  id: string;
  source: "official";
  version: number;
  title: string;
  totalDays: number;
  description: string;
  strategyRules: string[];
}

export interface ActiveChallenge {
  templateId: string;
  originTemplateId: string;
  initiatedBy?: ChallengeInitiator;
  currentDay: number;
  status: ChallengeStatus;
  startedAt: string;
}

export interface ChallengeInitiator {
  sourceFeedItemId: string;
  displayName: string;
  challengeTitle: string;
  clonedAt: string;
}

export interface TemplateParticipant {
  userId: string;
  templateId: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
  visibility: "listed" | "anonymous";
  sourceFeedItemId?: string;
}

export interface TemplateCommunity {
  templateId: string;
  participantCount: number;
  previewParticipants: TemplateParticipant[];
}

export interface SaboteurAssessment {
  riskLevel: RiskLevel;
  frictionPatterns: string[];
  evidence: string[];
  recommendedIntervention: "coach" | "action_card" | "protocol_change" | "support_prompt";
}

export interface CoachPlan {
  caption: string;
  socraticPrompt: string;
  suggestedAction: string;
  supportMessage?: string;
}

export interface ActionCard {
  id: string;
  checkInId: string;
  title: string;
  instruction: string;
  expiresAt: string;
  completedAt?: string;
  status: "active" | "completed" | "expired";
}

export interface AgentAction {
  id: string;
  checkInId: string;
  kind: AgentActionKind;
  status: AgentActionStatus;
  proposedPayload: Record<string, unknown>;
  createdAt: string;
}

export interface AgentPreference {
  acceptedActionTypes: string[];
  rejectedActionTypes: string[];
  constraints: string[];
  preferredTone?: "gentle" | "direct";
  recentFeedback: string[];
}

export interface CheckIn {
  id: string;
  challengeTemplateId: string;
  day: number;
  transcript: string;
  caption: string;
  visibility: Visibility;
  mediaUrl?: string;
  coach: AICoachResponse;
  assessment?: SaboteurAssessment;
  coachPlan?: CoachPlan;
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
  initiatedBy?: ChallengeInitiator;
  mediaUrl?: string;
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
  user: { id: string; displayName: string; status: "challenger" | "graduate"; adaptiveProtocolEnabled: boolean; participantVisibility: "listed" | "anonymous" };
  activeChallenge: ActiveChallenge | null;
  activeActionCard: ActionCard | null;
  report: TransformationReport | null;
}
