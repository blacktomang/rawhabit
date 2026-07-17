# RawHabit AI — Technical Specification

This document implements the MVP in [PRD.md](./PRD.md). The application uses a single in-memory demo session; a repository interface keeps future persistence isolated.

## 1. Architecture

```text
React + Vite client (localhost:5173)
  ├─ MediaRecorder, preview, local UI state
  └─ JSON / media HTTP requests
             │
             ▼
Bun + Express server (localhost:3001)
  ├─ in-memory repository + seeded community participants
  ├─ media storage / transcription adapter
  ├─ GPT-5.6 Accountability Agent + policy layer
  └─ JSON API
```

The browser never receives `OPENAI_API_KEY`. The server owns agent prompts, function execution, policy checks, and audit records.

## 2. Workspace ownership

| Path | Responsibility |
| --- | --- |
| `packages/shared/src/index.ts` | Cross-app entities and API contracts. |
| `apps/client/src/main.tsx` | App shell, screens, components, typed API calls. |
| `apps/server/src/repositories/habit.repository.ts` | Session, templates, feed, participants, agent records. |
| `apps/server/src/services/accountability-agent.service.ts` | GPT-5.6 Responses API orchestration. |
| `apps/server/src/services/agent-policy.service.ts` | Validates and executes permitted action proposals. |
| `apps/server/src/services/media.service.ts` | Media validation, storage, audio adapter. |

## 3. Shared contracts

```ts
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Visibility = "private" | "public";
export type ChallengeStatus = "active" | "completed" | "paused";
export type FeedItemKind = "daily_log" | "graduate_post";
export type AgentActionKind = "inject_action_card" | "mutate_challenge_protocol" | "request_encouragement";
export type AgentActionStatus = "proposed" | "awaiting_confirmation" | "executed" | "rejected" | "expired";
export type ChangeDirection = "build" | "reduce";
export type EnvironmentPrinciple = "make_obvious" | "make_easy" | "make_invisible" | "make_difficult";

export interface ChallengeTemplate {
  id: string;
  source: "official";
  version: number;
  direction: ChangeDirection;
  protocolSetup: HabitProtocolSetup;
  title: string;
  totalDays: number;
  description: string;
  strategyRules: string[];
}

export interface HabitProtocolSetup {
  primaryPrinciple: EnvironmentPrinciple;
  questions: Array<{ id: string; label: string; options: string[] }>;
}

export interface HabitProtocol {
  templateId: string;
  trigger: string;
  environmentChange: string;
  minimumAction: string;
  primaryPrinciple: EnvironmentPrinciple;
  updatedAt: string;
}

export interface ChallengeInitiator {
  sourceFeedItemId: string;
  displayName: string;
  challengeTitle: string;
  clonedAt: string;
}

export interface ActiveChallenge {
  templateId: string;
  originTemplateId: string;
  initiatedBy?: ChallengeInitiator;
  currentDay: number;
  status: ChallengeStatus;
  startedAt: string;
  graceDaysUsed: number;
  scheduleNote?: string;
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
  evidence: string[]; // private only
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

export interface CheckIn {
  id: string;
  challengeTemplateId: string;
  day: number;
  transcript: string;
  caption: string;
  visibility: Visibility;
  mediaUrl?: string;
  assessment: SaboteurAssessment;
  coach: CoachPlan;
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

export interface SessionState {
  user: { id: string; displayName: string; status: "challenger" | "graduate"; adaptiveProtocolEnabled: boolean };
  activeChallenge: ActiveChallenge | null;
  activeActionCard: ActionCard | null;
  habitProtocol: HabitProtocol | null;
  report: TransformationReport | null;
}
```

`TransformationReport` retains `challengeTitle`, `totalDays`, `themes`, `strengths`, `carryForward`, and `generatedAt`.

## 4. Accountability Agent

Starting/cloning a challenge is deterministic: the client renders that Official template’s `protocolSetup.questions`, saves the user’s answers as a `HabitProtocol`, and never asks GPT-5.6 to generate onboarding questions. The check-in request later awaits transcription and one GPT-5.6 Responses API call, including the saved protocol plus explicit feedback/preferences.

```text
media/demo transcript → whisper-1 → GPT-5.6 assessment + coach plan
→ policy validation → action-card creation / pending confirmation → API response
```

The model has these narrow function tools:

- `inject_action_card({ title, instruction, expiresAt })`
- `mutate_challenge_protocol({ type: "grant_grace_day" | "schedule_note", value })`
- `request_encouragement({ message })`

`agent-policy.service.ts` rejects invalid actions. It may create one 24-hour action card for the current user. Protocol changes are stored as pending and require an explicit confirmation endpoint. The model cannot call an external webhook or create a public post.

## 5. API

| Method | Endpoint | Response / behavior |
| --- | --- | --- |
| `GET` | `/health` | `{ status: "ok" }` |
| `GET` | `/api/templates` | Official `ChallengeTemplate[]` |
| `GET` | `/api/templates/:templateId/community` | `TemplateCommunity` plus paginated opted-in participants |
| `GET` | `/api/session` | `SessionState` |
| `GET` | `/api/feed` | Public seeded/user `FeedItem[]`, newest first |
| `POST` | `/api/challenge/start` | `{ templateId }` → Day 1 `SessionState` |
| `POST` | `/api/feed/:feedItemId/clone` | Start source template and save `ChallengeInitiator` |
| `POST` | `/api/challenge/protocol` | Save the user-edited Habit Protocol after Official setup |
| `POST` | `/api/media` | Raw WebM/MP4 storage; 15 MB maximum |
| `POST` | `/api/check-ins` | Media or demo transcript; returns check-in, card, pending action |
| `POST` | `/api/check-ins/:id/publish` | Explicitly creates public feed item |
| `POST` | `/api/action-cards/:id/complete` | Completes an active card |
| `POST` | `/api/agent-actions/:id/confirm` | Applies permitted protocol change |
| `POST` | `/api/agent-actions/:id/decline` | Rejects proposed action |
| `POST` | `/api/encouragement-requests/:id/confirm` | Publishes a generic opted-in encouragement signal |
| `POST` | `/api/challenge/dev-complete` | Non-production only, completes active challenge |
| `POST` | `/api/graduate/report` | Creates/caches report |
| `POST` | `/api/graduate/post` | Validated 1–500 character victory post |

Errors are `{ error: string, code: "VALIDATION_ERROR" | "NOT_FOUND" | "INVALID_STATE" | "PROCESSING_ERROR" }`.

## 6. Client component tree

```text
App
├─ FeedColumn
│  └─ FeedItemCard
│     ├─ CloneTemplateButton
│     └─ TemplateCommunityButton
└─ HabitRail
   ├─ TemplatePicker
   │  └─ HabitProtocolSetup (pre-authored questions, not AI-generated)
   ├─ ChallengeDashboard
   │  ├─ ProgressMeter
   │  ├─ ChallengeLineage
   │  ├─ HabitProtocolCard (user-editable)
   │  ├─ TemplateCommunityButton (avatar stack + count)
   │  ├─ TemplateCommunitySheet
   │  └─ ActiveActionCard
   ├─ DailyCheckIn
   │  ├─ MediaRecorder
   │  ├─ RecordingPreviewAndRetake
   │  └─ VisibilitySelector
   ├─ AccountabilityResult
   │  ├─ CoachPlanCard
   │  ├─ ProtocolChangeSheet
   │  └─ EncouragementConsentSheet
   └─ GraduateView
      ├─ TransformationReport
      └─ VictoryComposer
```

Public cards must never render `assessment`, evidence, risk level, or raw transcript. The community sheet lists only opted-in profile basics and can display a generic current-day value only if that option is later added explicitly. Template cards display the `Official` badge for their curated, versioned protocol.

## 7. Environment and verification

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
OPENAI_TRANSCRIPTION_MODEL=whisper-1
ALLOW_DEV_CHEAT=true
```

Verification: typecheck and build the client; exercise template start, check-in fallback, safe public publish, lineage-aware clone, participant sheet, action-card completion, and Graduate flow. A missing API key must leave the deterministic demo fallback functional.
