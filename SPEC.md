# RawHabit AI — Technical Specification

This specification implements the one-week MVP defined in [PRD.md](./PRD.md). It deliberately uses a single hardcoded session and an in-memory store so the core product loop is buildable and demonstrable without authentication or database work.

## 1. System boundary

```text
React client (localhost:5173)
  ├─ MediaRecorder captures video/audio
  ├─ local UI state and playback preview
  └─ HTTP JSON / multipart requests
           │
           ▼
Bun + Express server (localhost:3001)
  ├─ in-memory single-user store
  ├─ media validation and audio extraction adapter
  ├─ OpenAI speech-to-text adapter
  ├─ GPT-4o-mini coaching/report adapter
  └─ JSON API
```

The OpenAI API key is read by the server only. The browser never receives it.

## 2. Workspace and ownership

| Path | Owns |
| --- | --- |
| `packages/shared/src/index.ts` | Shared entities, request/response contracts, discriminated state types. |
| `apps/server/src/index.ts` | Express application and route registration. |
| `apps/server/src/store.ts` | Seed data and single-session mutable store. |
| `apps/server/src/openai.ts` | Transcription, coach, and report adapters plus deterministic fallback. |
| `apps/client/src/api.ts` | Typed fetch client. |
| `apps/client/src/App.tsx` | Page routing and top-level session bootstrap. |
| `apps/client/src/features/*` | Challenge, recorder, coach result, feed, and Graduate feature components. |

## 3. Shared contracts

Add these types to `@rawhabit/shared`. Existing `RiskLevel`, `CheckInPayload`, and `AICoachResponse` remain public.

```ts
export type ChallengeStatus = "active" | "completed";
export type FeedItemKind = "daily_log" | "graduate_post";
export type Visibility = "private" | "public";

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
  mediaUrl?: string;
  coach: AICoachResponse;
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
  user: { displayName: string; status: "challenger" | "graduate" };
  activeChallenge: ActiveChallenge | null;
  report: TransformationReport | null;
}
```

### API envelope

Successful responses are JSON and return their resource directly. Errors follow:

```ts
interface ApiError {
  error: string;
  code?: "VALIDATION_ERROR" | "NOT_FOUND" | "INVALID_STATE" | "PROCESSING_ERROR";
}
```

## 4. Server state and seed data

Create a module-level store reset on server restart:

```ts
interface AppStore {
  templates: ChallengeTemplate[];
  session: SessionState;
  checkIns: CheckIn[];
  feed: FeedItem[];
}
```

### Required templates

| id | Title | Duration |
| --- | --- | --- |
| `quit-smoking-30` | 30-Day Quit Smoking | 30 |
| `gym-21` | 21-Day Gym Consistency | 21 |
| `screen-free-14` | 14-Day Screen-Free Nights | 14 |

Seed the feed with 3 public, fictional check-ins. Clearly label demo content in source fixtures; do not use real personal stories or imagery.

## 5. HTTP API

### `GET /health`

Returns `{ "status": "ok" }`.

### `GET /api/templates`

Returns `ChallengeTemplate[]`.

### `GET /api/session`

Returns `SessionState`. The client calls this at startup and after any mutation.

### `POST /api/challenge/start`

**Body**

```json
{ "templateId": "quit-smoking-30" }
```

**Rules**

- `templateId` must reference a known template.
- Replaces a prior active challenge in this demo-only session.
- Sets `currentDay` to `1`, `status` to `active`, and session user status to `challenger`.

**Returns:** `SessionState`.

### `POST /api/check-ins`

Content type: `multipart/form-data`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `media` | File | Yes, unless `demoTranscript` is supplied | Browser recording, maximum 30 seconds. |
| `visibility` | `private` / `public` | Yes | Default selected in UI is private. |
| `demoTranscript` | string | Development only | Enables reliable demo fallback without media. |

**Rules**

- Active challenge must exist and have status `active`.
- Accept `audio/webm`, `video/webm`, `audio/mp4`, and `video/mp4` only.
- Reject an upload over 15 MB with HTTP 413.
- Server extracts/normalizes audio through an adapter. The initial implementation may pass supported audio directly to transcription; video extraction requires `ffmpeg` availability and must return a clear fallback error when unavailable.
- Send transcript, template context, current day, and strategy rules to the coach adapter.
- Create a `CheckIn`; add a `FeedItem` only when `visibility` is `public`.

**Returns**

```ts
interface CreateCheckInResponse {
  checkIn: CheckIn;
  feedItem?: FeedItem;
}
```

### `GET /api/feed`

Returns `FeedItem[]`, ordered newest first. Only public active-user items and seeded demo items may appear.

### `POST /api/templates/:templateId/clone`

Uses the selected template to invoke the same state transition as `/api/challenge/start`. Returns `SessionState`.

### `POST /api/challenge/dev-complete`

Dev/demo endpoint. No request body.

**Rules**

- An active challenge must exist.
- Set `currentDay = totalDays` and `status = completed`.
- Set user status to `graduate`.
- It is enabled only when `NODE_ENV !== "production"` or `ALLOW_DEV_CHEAT=true`.

**Returns:** `SessionState`.

### `POST /api/graduate/report`

**Rules**

- User must have a completed challenge.
- Generate a report from the challenge’s check-in captions/transcripts.
- If no real logs exist, include a clearly demo-safe fallback report built from template rules and completion state.
- Cache the report in `session.report`.

**Returns:** `TransformationReport`.

### `POST /api/graduate/post`

**Body**

```json
{ "caption": "Thirty days of choosing the next right step." }
```

**Rules**

- Session user must be a graduate.
- `caption` must be 1–500 trimmed characters.
- Create a `FeedItem` with `kind: "graduate_post"` and prepend it to the feed.

**Returns:** `FeedItem`.

## 6. OpenAI integration

### Client construction

Initialize only when `OPENAI_API_KEY` exists. Export an adapter interface so the routes have no SDK-specific logic:

```ts
interface AiService {
  transcribe(input: { audio: File | Blob }): Promise<string>;
  coach(input: {
    transcript: string;
    template: ChallengeTemplate;
    day: number;
  }): Promise<AICoachResponse>;
  report(input: {
    template: ChallengeTemplate;
    checkIns: CheckIn[];
  }): Promise<TransformationReport>;
}
```

### Transcription

Use OpenAI’s speech-to-text endpoint with the current supported transcription model configured via `OPENAI_TRANSCRIPTION_MODEL`, defaulting to `whisper-1`. The adapter returns trimmed plain text and rejects an empty transcript.

### Coach generation

Use `gpt-4o-mini`. Request strict JSON matching `AICoachResponse`.

System behavior:

```text
You are a concise, empathetic habit coach. Return only JSON.
Use one of low, medium, high, critical for riskLevel.
Write a factual, respectful feed caption under 140 characters.
Give one concrete next action drawn from or compatible with the provided strategy rules.
Do not diagnose, prescribe treatment, shame, or claim certainty.
For high or critical risk, compassionately recommend reaching out to a trusted person or local emergency/crisis support if immediate danger is possible.
```

Validate the parsed output before returning it. If validation fails or the API is unavailable, return a deterministic fallback with `riskLevel: "low"`, a neutral caption, and the first strategy rule as `suggestedAction`; include `aiMode: "fallback"` only in server logs, not the public contract.

### Report generation

Use `gpt-4o-mini` to return JSON with `themes`, `strengths`, and `carryForward`. Constrain themes and strengths to 2–3 items and report body to under 180 words when rendered. Fall back deterministically if unavailable.

## 7. Client implementation

### App-level data flow

1. On initial render, `GET /api/session`, `GET /api/templates`, and `GET /api/feed` run in parallel.
2. Keep server data in React state; after each mutation, apply the returned resource and refresh only dependent data.
3. No client-side auth token, user ID, or OpenAI key is stored.

### Screens and components

| Component | Inputs | Key behavior |
| --- | --- | --- |
| `TemplatePicker` | templates | Starts or clones a challenge. |
| `ChallengeDashboard` | session, template | Shows progress, rules, recorder CTA, and dev cheat in development. |
| `MediaRecorder` | `onSubmit(blob)` | Permissions, 15–30 second capture, preview, retake, audio-only fallback. |
| `CoachResult` | `CheckIn` | Shows private risk/coach result and visibility outcome. |
| `Feed` | feed items | Renders progress cards and clone controls. |
| `GraduateScreen` | report, session | Loads report and enables victory composer. |

### Recorder state machine

```text
idle → requesting_permission → ready → recording → preview → uploading
  └──────────────────────────────────────────→ error
uploading → result | error
```

- `recording` begins after a successful `getUserMedia` call.
- Enable Stop after 15 seconds, force Stop at 30 seconds.
- Revoke object URLs when a recording is replaced or component unmounts.
- In `error`, provide a text/demo transcript option in development.

### Visual requirements

- Progress appears as a labeled bar, never color alone.
- Risk level is private to the result screen; it is not shown on public feed cards.
- The Dev Cheat action uses an outlined “Demo tools” treatment, visually distinct from primary controls.
- The Graduate state changes the status badge and shows a celebratory but restrained report view.
- All loading actions have disabled controls and readable status messages.

## 8. Validation and errors

| Condition | Server response | Client response |
| --- | --- | --- |
| No active challenge | `409 INVALID_STATE` | Send user to template picker. |
| Unsupported/too-large media | `400` / `413 VALIDATION_ERROR` | Keep preview; explain supported recording formats. |
| Transcription failure | `502 PROCESSING_ERROR` | Keep preview; offer retry and demo fallback in dev. |
| Invalid AI response | fallback response | Render result normally; log validation failure server-side. |
| Graduate endpoint too early | `409 INVALID_STATE` | Keep Graduate UI locked and show active progress. |
| Invalid victory caption | `400 VALIDATION_ERROR` | Display inline character/count message. |

## 9. Environment configuration

```dotenv
OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODEL=whisper-1
PORT=3001
ALLOW_DEV_CHEAT=true
```

`OPENAI_API_KEY` is optional for local visual work: the fallback AI service enables the complete demo flow without it. It is required to demonstrate live transcription and coaching.

## 10. Test plan

### Server

- Start a known template and verify Day 1 active state.
- Reject a check-in without an active challenge.
- Submit `demoTranscript` and verify a typed `CheckIn` result.
- Confirm private submission does not alter `GET /api/feed`.
- Confirm public submission prepends a daily feed item.
- Confirm `dev-complete` yields Graduate session state.
- Confirm report creation and valid Graduate post after completion.

### Client / manual demo

- Grant and deny media permissions; verify audio-only or demo fallback.
- Record, preview, retake, and submit a check-in.
- Confirm progress and feed update occur without a full page reload.
- Confirm cloning resets to a fresh active challenge at Day 1.
- Confirm the Graduate composer remains unavailable until completion.

## 11. Delivery definition

The MVP is ready to demo when a fresh browser session can select a template, submit a real or demo-fallback check-in, see coaching and a feed update, trigger the dev completion transition, read a report, and publish a Graduate post—without authentication, a database, or manual state editing.
