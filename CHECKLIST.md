# RawHabit AI — Build Checklist

Source of truth: [PRD.md](./PRD.md) and [SPEC.md](./SPEC.md).  
Definition of done: a clean demo session completes the complete private-check-in → community → Graduate loop without manual state edits.

## What this checklist is

This is the implementation order and test plan. Each item is small enough to complete, verify, and demo. Build P0 top-to-bottom before starting P1 polish.

## P0 — Foundation

- [ ] Run `bun install` from the repository root.
- [ ] Add `.env.example` with `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `OPENAI_TRANSCRIPTION_MODEL=whisper-1`, and `ALLOW_DEV_CHEAT`.
- [ ] Confirm `bun dev` starts client and server.
- [ ] Confirm `GET /health` returns `{ "status": "ok" }`.
- [x] Add current challenge, community, action-card, preference, and Habit Protocol contracts to `@rawhabit/shared`.
- [x] Extend the in-memory repository with templates, seeded fictional feed cards, participant communities, action cards, and user preference records.
- [x] Keep raw media/transcripts/assessments out of public feed queries.
- [x] Add a `README.md` with setup, fallback/demo instructions, architecture, and how Codex/GPT-5.6 were used.

## P0 — Templates, clones, and community

- [x] Seed the versioned **RawHabit Official** Quit Smoking, Gym Consistency, and Screen-Free Nights templates.
- [x] Render an Official badge; do not permit community editing of official strategy rules in the MVP.
- [x] Define each Official template’s fixed 2–3 Habit Protocol setup questions and answer options.
- [x] Mark templates as `build` or `reduce`; map the default protocol to the appropriate environment principle.
- [x] Seed opted-in fictional template participants and avatar placeholders.
- [x] Implement `GET /api/templates` and `GET /api/templates/:templateId/community`.
- [x] Implement `POST /api/challenge/start` at Day 1.
- [x] Replace template-only cloning with `POST /api/feed/:feedItemId/clone`.
- [x] Save `ChallengeInitiator` from the source public feed item.
- [x] Render fixed Habit Protocol setup after both start and clone; do not call the agent for onboarding questions.
- [x] Save a separate, user-owned Habit Protocol; do not copy the initiator’s protocol on clone.
- [x] Add a user-editable Habit Protocol card on the active dashboard.
- [x] Render a participant community sheet and source attribution without private check-in fields.

## P0 — Recorder and private check-in

- [ ] Implement recorder states: idle → permission → recording → preview → submitting → result/error.
- [ ] Request camera/microphone through `MediaRecorder`.
- [x] Provide audio-only fallback when camera access is denied.
- [x] Enforce 15-second minimum and 30-second maximum in normal UI.
- [x] Add preview, retake, object-URL cleanup, and a 15 MB media limit.
- [x] Default every check-in to private.
- [x] Add a development-only transcript fallback for reliable demonstrations.
- [ ] Keep the recording draft available after a recoverable failure.

## P0 — Backend agent pipeline

- [x] Create a `CheckInJob` record with `queued | transcribing | coaching | complete | failed` status.
- [x] `POST /api/check-ins` returns `202 { jobId }` after saving the job.
- [x] Implement `GET /api/check-in-jobs/:jobId/events` as an SSE stream.
- [x] Emit `processing`, `transcript_ready`, `coach_ready`, `action_card_ready`, `complete`, and `failed` events.
- [x] Provide `GET /api/check-in-jobs/:jobId` polling fallback when SSE disconnects.
- [x] Send audio to `whisper-1`; preserve a deterministic fallback when a key, media, or service is unavailable.
- [x] Use the GPT-5.6 Responses API for one awaited structured result containing Saboteur assessment and Coach plan.
- [x] Pass the active user’s Habit Protocol and explicit preferences into the agent context.
- [x] Use strict JSON schema output for coach responses.
- [x] Keep Saboteur assessment, transcript evidence, and risk label private.
- [x] Validate every model result server-side before saving or rendering it.
- [x] Add non-diagnostic high/critical support copy; never claim emergency detection.

## P0 — Agent actions and responsiveness

- [ ] Add policy-enforced `inject_action_card`, `mutate_challenge_protocol`, and `request_encouragement` proposals.
- [x] Permit one active 24-hour action card for the current user.
- [ ] Require confirmation before applying grace-day or schedule changes.
- [x] Add controls: Do it, Adjust my protocol, Give me another option, Not now, and This wasn’t helpful.
- [x] Store accepted, alternative-requested, dismissed, and unhelpful feedback in the in-memory preference profile.
- [x] Maintain an in-memory `AgentPreference` profile per user: accepted/rejected action types, constraints, tone, and recent feedback.
- [x] Include explicit preferences in the next Coach context.
- [ ] Verify dismissed suggestions are never applied later without a new user action.

## P0 — Result and feed

- [x] Render SSE processing states: “Listening…”, “Finding the friction…”, and “Building your next step…”.
- [x] Render Coach plan, Socratic question, and private action card.
- [x] Add an explicit publish control after the user reviews the result.
- [x] Implement `POST /api/check-ins/:id/publish` to create a safe public feed item.
- [x] Keep public cards to caption, Day X/Y, progress, coach snippet, and clone/community controls.
- [ ] Add optional, user-confirmed generic “Encouragement welcome” signal.
- [x] Verify the feed never renders risk, transcript, assessment evidence, or raw private media.

## P0 — Graduate loop

- [x] Guard `POST /api/challenge/dev-complete` to non-production or `ALLOW_DEV_CHEAT=true`.
- [x] Visually separate the Dev Cheat from normal controls.
- [x] Complete the challenge: set final day, completed status, and Graduate profile status.
- [x] Implement `POST /api/graduate/report` with GPT-5.6 summary plus deterministic fallback.
- [x] Keep report below 180 words and non-clinical.
- [x] Unlock the Graduate composer only after completion.
- [x] Implement validated `POST /api/graduate/post` (1–500 characters).
- [x] Confirm victory post appears at the top of the feed.

## P1 — Polish and resilience

- [ ] Add loading/disabled/error states for every mutation.
- [ ] Test narrow mobile layout, desktop layout, keyboard controls, and non-color status labels.
- [ ] Use clearly fictional seed names/content only.
- [ ] Add empty states for no active challenge, no participants, and no feed items.
- [ ] Add SSE reconnect with polling fallback.
- [ ] Expire stale action cards on read and show the expiry clearly.
- [ ] Add request IDs and agent-action audit logs to server output.

## Verification pass

- [x] `bun run typecheck`
- [x] `bun --filter '@rawhabit/client' build`
- [ ] Test health, templates, session, community, feed, and clone endpoints.
- [ ] Test camera granted, camera denied/audio fallback, retake, and transcript fallback.
- [ ] Test private submission: no public feed update.
- [ ] Test public publish: safe card appears without refresh.
- [ ] Test SSE completed, failed, and disconnected/polling paths.
- [ ] Test accept, adjust, alternative, dismiss, and unhelpful feedback paths.
- [ ] Test the next agent run receives relevant explicit preference feedback.
- [ ] Test Dev Cheat → report → Graduate post.
- [ ] Restart the server and confirm the known in-memory demo state returns.

## Build Week handoff

- [ ] Keep the repository public with relevant license, or share private access with `testing@devpost.com` and `build-week-event@openai.com`.
- [ ] Document sample/demo data and all setup steps in the README.
- [ ] Record a public YouTube video under three minutes showing the project working.
- [ ] Include voiceover explaining where Codex accelerated development and how GPT-5.6 powers the agent flow.
- [ ] Add repository URL, Apps for Your Life category, and the `/feedback` Codex session ID to Devpost.
