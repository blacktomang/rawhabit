# RawHabit AI — One-Week Hackathon PRD

## Product snapshot

**RawHabit AI** is a zero-filter habit accountability app where people record a 15–30 second daily video or audio check-in, get an immediate tactical AI response, and share real progress on a social feed. Completing a challenge changes the user from an active challenger to a **Graduate**, unlocking a free-form victory update and an AI-generated transformation report.

**Category:** Apps for Your Life — OpenAI Hackathon  
**Scope:** One-week, web-only MVP  
**Core loop:** Record → AI process → feed update → complete challenge → Graduate unlock

## Problem and opportunity

Habit trackers are good at counting days but poor at meeting someone in the messy middle: a craving, a relapse, or a difficult workout day. These moments are often hidden rather than reflected on. RawHabit makes a brief honest check-in the main interaction, then returns a single practical next step and makes progress visible when the user chooses to share it.

## Product goals

1. Demonstrate a complete recorded-media-to-AI-coach experience.
2. Turn the completed AI result into a visible public feed item with clear challenge progress.
3. Demonstrate the emotional reward of completion through a Graduate state and transformation report.
4. Keep implementation narrow enough to ship and demo confidently in one week.

### Success criteria

| Moment | Demo success condition |
| --- | --- |
| Setup | Select a habit and start a challenge in under 30 seconds. |
| Logging | Record, submit, and view a coach response in one flow. |
| AI | Transcription and structured coaching appear within a typical demo-friendly wait time. |
| Social proof | New check-in appears on the feed with `Day X of Y` progress. |
| Completion | One action demonstrates the Graduate transition, victory post, and AI report. |

## Scope decisions

### In scope

- Hardcoded single-user session; no signup, login, or multi-user authorization.
- Selection from pre-configured challenge templates, starting with **30-Day Quit Smoking**.
- Browser-based 15–30 second video/audio recording.
- Audio extraction, speech-to-text, structured GPT coaching, and feed card creation.
- A public-style, seeded social feed plus the active user’s new posts.
- Developer-only shortcut that completes the challenge for presentation.
- Graduate state, free-form victory post, and transformation report.
- Template clone controls as an interaction/demo surface.

### Explicitly out of scope

- Real authentication, profiles, follow relationships, comments, likes, notifications, or DMs.
- Persistent multi-user data, production media hosting, moderation tooling, or native apps.
- Arbitrary challenge authoring; templates are predefined for this build.
- Medical diagnosis, treatment, or crisis intervention.

## Primary user and demo persona

**Maya**, 27, is quitting smoking. She wants to acknowledge a difficult moment without writing a polished post. She chooses the 30-day template, records an honest update after a craving, gets a concrete action based on her strategy, and sees her progress alongside other challenge stories. At completion, RawHabit celebrates the process rather than just the streak.

## Functional requirements

### 1. Challenge selection and strategy setup

The home screen presents 2–3 predefined challenge cards. Each includes a name, duration, short description, and strategy rules. The primary demo template is **30-Day Quit Smoking**.

**Example preconfigured rules**

- After a craving, drink water and take a 10-minute walk.
- Text an accountability contact before buying cigarettes.
- If a slip happens, record it honestly and restart the next day without self-judgment.

**Acceptance criteria**

- Selecting a template creates the hardcoded user’s active challenge state.
- The active challenge displays title, progress, current day, total days, and strategy rules.
- A challenge starts on Day 1 and sends the user to the daily logging view.

### 2. Daily Raw Logger

The user can capture a brief, unedited check-in in the browser.

**Flow**

1. Select **Record today’s raw log**.
2. Browser requests camera/microphone access.
3. Record between 15 and 30 seconds; show elapsed time and stop control.
4. Preview, retake, or submit the recording.
5. Show a processing state while AI results arrive.

**Acceptance criteria**

- Use the browser `MediaRecorder` API.
- Support audio-only fallback when camera permission is unavailable.
- Show recording duration and block final submit before 15 seconds in the normal UI.
- Allow a retake before submission.
- For demo resilience, provide a development sample recording/transcript fallback when media permissions or an API key are absent.

### 3. OpenAI audio pipeline

On submission, the server receives media, extracts its audio track, and runs the following pipeline:

```text
Browser recording → Express upload endpoint → audio extraction
→ OpenAI speech-to-text → GPT-4o-mini → validated coach result → feed item
```

**Inputs to coaching**

- Current transcript.
- Selected challenge name.
- Current day and total days.
- Pre-configured strategy rules.

**Required coach response**

```ts
type RiskLevel = "low" | "medium" | "high" | "critical";

interface AICoachResponse {
  riskLevel: RiskLevel;
  caption: string;
  coachMessage: string;
  suggestedAction?: string;
}
```

**Behavior requirements**

- The caption is a concise, respectful summary suitable for a feed card.
- The coach message is empathetic and contains one direct, achievable action.
- Risk level is displayed as a private-to-the-user support signal, not a diagnosis.
- Output must be parsed and validated server-side before client display.
- On API failure, display a friendly fallback coach message and permit retry; do not lose the recording draft.

### 4. Feed update and template clone

After AI processing, the check-in becomes a feed item. Seeded items make the social feed feel populated before the user records their own entry.

**Feed card contents**

- Challenge name and creator display name.
- Caption and optional video preview.
- `Day X of Y` text and progress bar.
- AI coach snippet (shortened for the feed).
- **Clone template** action.

**Acceptance criteria**

- A completed daily submission appears at the top of the active feed without a page refresh.
- Feed data includes seeded cards plus in-memory active-user cards.
- Clone template selects that template for the single user and starts a fresh Day 1 state.

### 5. Challenge completion and Graduate unlock

Completion is a first-class product moment. For hackathon presentation, the active challenge screen includes a clearly labelled **Dev Cheat: Complete Challenge** action.

**Completion flow**

1. The developer activates the cheat button during the demo.
2. Current day becomes total days; active challenge changes to completed.
3. User status changes to **Graduate**.
4. App requests or shows a generated **AI Transformation Report**.
5. The Graduate composer unlocks for a free-form victory post.
6. Publishing the post adds a Graduate feed card.

**Acceptance criteria**

- The cheat button is visually separated from normal user controls and marked as demo/dev-only.
- Completion state persists for the browser session.
- Graduate composer permits text plus an optional existing media attachment for MVP.
- A user cannot access the Graduate composer while a challenge is active.
- Transformation report is generated from available check-in summaries; a polished deterministic fallback is shown if AI is unavailable.

### 6. AI Transformation Report

The report turns repeated check-ins into a lightweight story of progress. It should feel reflective, not clinical.

**Report fields**

- Challenge completed and total duration.
- “What changed”: 2–3 short themes derived from logs.
- “Strengths you practiced”: 2–3 specific behaviors.
- “Carry forward”: one concrete next habit.

**Acceptance criteria**

- Report is under 180 words and readable on one mobile viewport.
- It uses supportive language and does not make medical or diagnostic claims.
- User can post a free-form victory message after viewing the report.

## UX and screen map

| Screen | Main content | Primary action |
| --- | --- | --- |
| Challenge picker | Preconfigured habit templates and rules | Start challenge |
| Today / Active challenge | Day count, progress, strategy rules | Record raw log |
| Recorder | Media preview, timer, retake | Submit check-in |
| AI result | Caption, risk signal, coach action | Add to feed |
| Feed | Seeded and newly created log cards | Clone template |
| Graduate | Transformation report and unlocked composer | Publish victory post |

## State model

```text
No active challenge
  → Active challenge (Day 1…Day N)
  → Daily recording submitted
  → AI result saved and feed updated
  → Completed challenge
  → Graduate unlocked
  → Victory post published
```

## Technical architecture

### Bun monorepo

| Workspace | Responsibility |
| --- | --- |
| `packages/shared` | Shared TypeScript contracts: `RiskLevel`, `CheckInPayload`, `AICoachResponse`, plus goal/feed state types as needed. |
| `apps/client` | Pure React, Vite, Tailwind CSS, `MediaRecorder`, local state, and UI flows. |
| `apps/server` | Bun, Express, OpenAI SDK, upload/processing endpoints, and in-memory MVP store. |

### Suggested API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/templates` | Return preconfigured challenges. |
| `POST` | `/api/challenge/start` | Select the single user’s active template. |
| `GET` | `/api/challenge` | Return current challenge and Graduate state. |
| `POST` | `/api/check-ins` | Accept media and run the AI pipeline. |
| `GET` | `/api/feed` | Return seeded plus active-user feed items. |
| `POST` | `/api/challenge/dev-complete` | Demo-only completion transition. |
| `POST` | `/api/graduate/report` | Produce transformation report. |
| `POST` | `/api/graduate/post` | Publish a free-form Graduate post. |

### Data structures (in memory for MVP)

- `ChallengeTemplate`: id, title, totalDays, description, strategyRules.
- `ActiveChallenge`: templateId, currentDay, status (`active | completed`), startedAt.
- `CheckIn`: id, day, mediaUrl/localBlobRef, transcript, caption, coachResult, createdAt.
- `FeedItem`: id, kind (`daily_log | graduate_post`), progress, caption, media, createdAt.
- `TransformationReport`: themes, strengths, carryForward, generatedAt.

## Safety and privacy boundaries

- Check-ins should be private by default in the demo; the visible feed can use seeded, consented demo content and explicit publish actions.
- The AI gives support and a next action, never medical diagnosis or treatment advice.
- For high or critical risk language, show a gentle prompt to contact a trusted person or local emergency/crisis support if the user may be in immediate danger.
- Do not claim that the model has detected an emergency or a health condition.
- Store no production credentials in the client. The OpenAI key remains server-only.

## One-week build plan

| Day | Deliverable |
| --- | --- |
| 1 | Bun workspace, shared contracts, templates, and basic client navigation. |
| 2 | Active challenge UI, progress state, and browser recorder with sample fallback. |
| 3 | Express upload endpoint, speech-to-text integration, and `gpt-4o-mini` structured coaching. |
| 4 | Result view, feed update, and seeded social cards. |
| 5 | Dev completion transition, Graduate screen, report, and victory composer. |
| 6 | Error states, responsive polish, demo data, and end-to-end testing. |
| 7 | Record demo video, refine Devpost description, and submit. |

## Demo script

1. Pick **30-Day Quit Smoking** and show its preconfigured backup rules.
2. Record a 15–30 second candid check-in about a craving.
3. Show the transcript, risk level, short caption, and tactical coaching action.
4. Publish it; show the new feed card with `Day 1 of 30` progress.
5. Select **Dev Cheat: Complete Challenge**.
6. Reveal Graduate status and the AI Transformation Report.
7. Write and publish a short free-form victory post.
8. Close on the updated feed showing both consistent daily accountability and a completion celebration.

## Devpost copy starter

**Tagline:** Raw daily check-ins, tactical AI coaching, and a Graduate moment that celebrates the work behind real change.

**Built with:** Bun, React, Vite, Tailwind CSS, Express, TypeScript, OpenAI API.

**Short description:** RawHabit AI turns a 30-second honest check-in into a practical next step. Record the hard moment, get immediate AI coaching, share progress when you choose, and graduate with a transformation report when your challenge is complete.
