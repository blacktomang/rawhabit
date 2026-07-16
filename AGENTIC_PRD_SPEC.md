# RawHabit AI — Agentic PRD & Technical Specification

**Hackathon track:** Apps for Your Life · OpenAI Build Week  
**Status:** Confirmed MVP scope: in-memory demo; optional public encouragement; no community/webhook integration  
**Stack:** Bun workspaces · React/Vite/Tailwind · Express · OpenAI Node SDK · `@rawhabit/shared`

## 1. Product thesis

RawHabit is a social accountability app for the unpolished middle of habit change. A person makes a 15–30 second audio/video check-in, receives one practical next step, and may share their progress to a public feed. Completion of a challenge earns Graduate status and unlocks free-form victory posts.

The **Accountability Agent** turns a transcript and the user’s challenge protocol into a structured support plan. It can propose a temporary grace day, create an expiring action card, or ask the user to send an SOS to a consented community channel. It is not a diagnostic, emergency-response, or autonomous social-posting system.

### Primary demo loop

```text
Select template → record check-in → transcribe → risk/support assessment
→ coach plan + optional action card → publish only with user choice
→ complete challenge → Graduate report + victory post
```

## 2. Goals and guardrails

### Goals

1. Make honest daily reflection faster than a traditional habit tracker.
2. Show a credible tool-using AI workflow with visible, useful outcomes.
3. Encourage community support without making users disclose sensitive check-ins.
4. Make achievement earned: only Graduates can publish free-form victory posts.

### Non-goals for this hackathon

- Clinical, medical, or crisis assessment; treatment advice; or claims of emergency detection.
- Automatic posting of check-in content, risk labels, or alerts to public feeds/Discord.
- Auth, real multi-user relationships, full moderation, or durable production storage.

### Safety and privacy contract

- Check-ins are **private by default**. Publishing is a separate explicit choice.
- `critical` is an internal support-routing label, not a diagnosis and never a public badge.
- There is no community integration in this MVP. A user may opt in to a public, non-diagnostic “encourage me” signal; it never exposes transcript evidence or a risk label.
- The app shows immediate, locale-appropriate “contact local emergency services / a trusted person” copy when the user indicates immediate danger. It must not wait for a model or community response.
- The policy layer, not the model, decides whether an action is permitted. All agent actions are audited.

## 3. Experience requirements

### Challenge and feed

- Templates: Quit Smoking (30), Gym Consistency (21), Screen-Free Nights (14).
- Active challenge shows `Day X of Y`, strategy rules, active action card, and a demo-only completion control.
- Public feed contains seeded fictional examples and deliberately public check-ins. Each post shows its own progress and lets a visitor clone its template.
- A clone retains a **challenge lineage** and contributes to its template’s visible community. A compact avatar stack and participant count (for example, “Alex, Jordan, and 28 others are building this”) opens a **People building this habit** sheet. The sheet lists only people who consented to template-participant visibility; it never reveals private check-ins, transcripts, AI assessments, or precise risk/support state.

### Check-in and agent result

1. Capture 15–30 seconds with `MediaRecorder`; offer audio-only fallback and a development transcript fallback.
2. Upload media privately; transcribe audio with `whisper-1`.
3. GPT-5.6 produces a structured assessment, then a Coach plan. The UI presents the plan as advice, not a verdict.
4. If a tactical action is appropriate, the agent proposes a 24-hour action card. The server may create it automatically because it affects only the current user and expires.
5. If high-support language is appropriate, present a private immediate-support message. The user may optionally publish a generic “encourage me” signal; do not publish an alert automatically.

### Completion

- The dev cheat completes an active challenge only in non-production.
- On completion, the server creates a transformation report from check-in summaries, then unlocks the Graduate composer.

## 4. Agent design

Use the **Responses API** with strict function schemas. Function calling is a request from the model; the Express server validates, executes, audits, and returns each result before receiving a final user-facing response. [OpenAI’s function-calling guide](https://developers.openai.com/api/docs/guides/function-calling) describes this multi-step application-controlled loop and strict schema support.

### A. Saboteur assessment (structured, no tools)

Input: transcript, challenge, day, strategy rules, recent check-in summaries, and user-selected privacy preferences.

Output (`SaboteurAssessment`): detected friction patterns, risk level, evidence snippets, and a recommended intervention class. It may never instruct a public disclosure.

### B. Coach planner (tools available)

Input: the assessment and challenge context. Output: a short Socratic response and at most one action proposal per category.

Available function tools:

| Tool | Model may propose | Server policy |
| --- | --- | --- |
| `inject_action_card` | A small next action that expires in 24 hours | Auto-execute only for the active user; validate expiry, text length, and one-card limit. |
| `mutate_challenge_protocol` | `grant_grace_day` or a limited schedule shift | Reject unless user has opted into adaptive protocol; require a user confirmation for any schedule change. |
| `request_encouragement` | A private pending generic encouragement request | Never publishes. The user decides whether to publish the generic signal. |

No community webhook is included until a real moderated community and response protocol exist. This preserves the agentic demo—the agent identifies and prepares a high-value intervention—without allowing a probabilistic output to disclose health-adjacent content.

### Execution timing

The MVP uses a foreground, sequential orchestration for each submitted check-in:

```text
Upload/transcribe → await Saboteur assessment → await Coach plan/tool proposals
→ execute safe action-card proposal → return one combined result to the UI
```

The UI shows one “Processing your check-in…” state. The Saboteur and Coach can be represented as two structured sections in **one GPT-5.6 Responses API call**: the model performs assessment first and plans from it in the same schema. This is the recommended MVP implementation because it avoids a second network round trip while preserving an explainable two-role product story. A later production version may use two separate calls or a queued job if transcription/analysis becomes slow.

### Risk routing

| Level | User experience | Public visibility |
| --- | --- | --- |
| `low` | Coach action and optional action card | User controls post visibility. |
| `medium` | Coach action, optional protocol proposal | User controls post visibility. |
| `high` | Supportive check-in, trusted-person suggestion, optional “encourage me” consent | Never show risk label publicly. |
| `critical` | Immediate-safety copy, trusted-person/local emergency guidance, optional “encourage me” consent | Never show risk label or “SOS border” publicly. |

For a pitch visual, use a **private “Support available” state** on the author’s dashboard. An optional public “Encouragement welcome” chip is permissible only when the user explicitly chooses it and must not reveal the AI label.

## 5. Shared data model (`packages/shared/src/index.ts`)

```ts
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Visibility = "private" | "public";
export type ChallengeStatus = "active" | "completed" | "paused";
export type FeedItemKind = "daily_log" | "graduate_post";
export type AgentActionKind =
  | "inject_action_card"
  | "mutate_challenge_protocol"
  | "request_encouragement";
export type AgentActionStatus = "proposed" | "awaiting_confirmation" | "executed" | "rejected" | "expired";

export interface ChallengeTemplate {
  id: string;
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
  graceDaysUsed: number;
  scheduleNote?: string;
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
  previewParticipants: TemplateParticipant[]; // maximum three, listed only
}

export interface SaboteurAssessment {
  riskLevel: RiskLevel;
  frictionPatterns: string[];
  evidence: string[]; // private, short transcript-derived fragments
  recommendedIntervention: "coach" | "action_card" | "protocol_change" | "support_prompt";
}

export interface CoachPlan {
  caption: string; // <= 140 chars; safe for a feed only when user publishes
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
  executedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface EncouragementRequest {
  id: string;
  checkInId: string;
  status: "pending_user_confirmation" | "published" | "declined";
  publicMessage: string;
  consentedAt?: string;
  publishedAt?: string;
}

export interface CheckIn {
  id: string;
  challengeTemplateId: string;
  day: number;
  transcript: string; // private
  caption: string;
  visibility: Visibility;
  mediaUrl?: string;
  assessment: SaboteurAssessment; // private
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

export interface TransformationReport {
  challengeTitle: string;
  totalDays: number;
  themes: string[];
  strengths: string[];
  carryForward: string;
  generatedAt: string;
}

export interface SessionState {
  user: {
    id: string;
    displayName: string;
    status: "challenger" | "graduate";
    adaptiveProtocolEnabled: boolean;
    communityAlertsEnabled: boolean;
  };
  activeChallenge: ActiveChallenge | null;
  activeActionCard: ActionCard | null;
  report: TransformationReport | null;
}
```

## 6. Express API

All error responses use `{ error, code }`; server owns authorization/policy even in the hardcoded-session MVP.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check. |
| `GET` | `/api/templates` | Return challenge templates. |
| `GET` | `/api/templates/:templateId/community` | Return visible participant count and paginated, opted-in participants. |
| `GET` | `/api/session` | Return current session and active card. |
| `POST` | `/api/challenge/start` | `{ templateId }` → reset to Day 1. |
| `POST` | `/api/feed/:feedItemId/clone` | Start the source post’s template and save its public initiator attribution. |
| `GET` | `/api/feed` | Return seeded plus explicitly public posts. |
| `POST` | `/api/media` | Store raw WebM/MP4 video; validate 15 MB max. |
| `POST` | `/api/check-ins` | Multipart media or demo transcript; run transcription + assessment + coach loop. |
| `POST` | `/api/check-ins/:id/publish` | Explicitly publish an existing private check-in. |
| `POST` | `/api/action-cards/:id/complete` | Mark a valid active card complete. |
| `POST` | `/api/agent-actions/:id/confirm` | Confirm a protocol change after rendering its exact effect. |
| `POST` | `/api/agent-actions/:id/decline` | Reject a pending proposal. |
| `POST` | `/api/encouragement-requests/:id/confirm` | Publish the pre-rendered generic encouragement signal. |
| `POST` | `/api/encouragement-requests/:id/decline` | Permanently discard the pending request. |
| `POST` | `/api/challenge/dev-complete` | Development-only completion transition. |
| `POST` | `/api/graduate/report` | Generate/cache transformation report. |
| `POST` | `/api/graduate/post` | Publish validated 1–500 character victory post. |

### `POST /api/check-ins` response

```ts
interface CreateCheckInResponse {
  checkIn: CheckIn;
  actionCard?: ActionCard;
  pendingProtocolAction?: AgentAction;
  pendingEncouragementRequest?: EncouragementRequest;
}
```

### Server modules

```text
services/
  media.service.ts        // validation, storage, audio extraction adapter
  transcription.service.ts
  accountability-agent.ts // Responses API loop, schemas, prompt assembly
  agent-policy.service.ts // validates/executes permitted actions + audits
  encouragement.service.ts   // confirmation-gated generic public signal
  graduation.service.ts
repositories/
  habit.repository.ts     // in-memory MVP store; repository interface ready for DB
```

Environment additions: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `ALLOW_DEV_CHEAT`.

## 7. React component tree

```text
App
├─ AppShell
│  ├─ Topbar
│  └─ SafetyNotice
├─ FeedColumn
│  ├─ FeedHeader
│  └─ FeedItemCard
│     └─ CloneTemplateButton              (starts a lineage-aware clone)
└─ HabitRail
   ├─ TemplatePicker                     (no active challenge)
   ├─ ChallengeDashboard                 (active challenge)
   │  ├─ ProgressMeter
   │  ├─ ChallengeLineage                (e.g. “Initiated by Alex”)
   │  ├─ TemplateCommunityButton          (avatar stack + participant count)
   │  └─ TemplateCommunitySheet           (“People building this habit”)
   │  ├─ StrategyRules
   │  ├─ ActiveActionCard
   │  └─ DevCompleteControl              (development only)
   ├─ DailyCheckIn
   │  ├─ MediaRecorder
   │  ├─ RecordingPreviewAndRetake
   │  └─ VisibilitySelector
   ├─ AccountabilityResult
   │  ├─ CoachPlanCard
   │  ├─ ActionCard
   │  ├─ ProtocolChangeSheet             (confirmation required)
   │  └─ EncouragementConsentSheet        (optional, confirmation required)
   └─ GraduateView                       (completed only)
      ├─ TransformationReport
      └─ VictoryComposer
```

Client state queries: `session`, `templates`, `feed`; mutations invalidate `session` and selectively prepend returned feed items. The UI must not render assessment evidence or risk level in `FeedItemCard`.

## 8. Hackathon demo sequence

1. Join Quit Smoking and show Day 1 plus strategy rule.
2. Submit a demo transcript about a craving; show the tactical coach response and action card.
3. Publish the harmless summary; clone Alex’s public Gym challenge and show the avatar stack and “People building this habit” sheet on Maya’s new challenge dashboard.
4. Submit a high-support demo transcript; show the private “encouragement welcome” consent sheet and decline it—demonstrating privacy-preserving agency.
5. Use Dev Cheat, generate the report, and publish a Graduate victory post.

## 9. Confirmed MVP decisions

- No community/Discord integration until a moderated community exists.
- A generic public “Encouragement welcome” signal is optional and user-confirmed.
- State remains in memory for the demo.
- Saboteur and Coach are conceptual stages in one awaited GPT-5.6 agent response. The request returns after both are complete; it is not a background job.
- Template clones retain public initiator attribution and can add the user to the template community only with participant-visibility consent. The community view uses public profile basics only—never private media or AI assessment data.
