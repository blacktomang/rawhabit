# RawHabit AI — One-Week Build Checklist

Source documents: [PRD.md](./PRD.md) and [SPEC.md](./SPEC.md).  
Definition of done: a fresh browser session completes the full demo loop without manual data edits.

## P0 — Foundation

- [ ] Run `bun install` from the repository root.
- [ ] Confirm `bun dev` starts the Vite client and Express server together.
- [ ] Add `.env` from `.env.example`; keep `OPENAI_API_KEY` server-only.
- [ ] Verify `GET /health` returns `{ "status": "ok" }`.
- [ ] Extend `@rawhabit/shared` with challenge, feed, Graduate, and transformation-report contracts from the spec.
- [ ] Create the in-memory server store and three hardcoded challenge templates.
- [ ] Add three clearly fictional seeded feed cards.
- [ ] Implement `GET /api/templates`, `GET /api/session`, and `GET /api/feed`.
- [ ] Verify client startup fetches templates, session state, and feed data.

## P0 — Challenge setup

- [ ] Build the template-picker screen.
- [ ] Display title, duration, description, and strategy rules for each template.
- [ ] Implement `POST /api/challenge/start`.
- [ ] Start **30-Day Quit Smoking** and verify session state is Day 1 / active.
- [ ] Build the active-challenge dashboard with `Day X of Y` and an accessible progress bar.
- [ ] Display selected strategy rules on the dashboard.
- [ ] Implement `POST /api/templates/:templateId/clone` using the same start transition.
- [ ] Verify cloning a feed template returns the user to Day 1 of the selected challenge.

## P0 — Recorder and submission

- [ ] Build the recorder state machine: idle → permission → ready → recording → preview → upload/result.
- [ ] Request browser camera and microphone permissions with `MediaRecorder`.
- [ ] Support audio-only fallback when camera access is denied.
- [ ] Show elapsed recording time.
- [ ] Enforce the normal 15-second minimum and 30-second maximum.
- [ ] Add preview playback, discard, and retake actions.
- [ ] Revoke object URLs when recordings are discarded or replaced.
- [ ] Add private/public visibility selection; default to private.
- [ ] Add development-only demo transcript fallback for permission/API failures.
- [ ] Implement multipart `POST /api/check-ins` handling.
- [ ] Validate active challenge, content type, and 15 MB upload size on the server.
- [ ] Keep submitted preview/state available when upload or processing fails.

## P0 — OpenAI pipeline and coaching

- [ ] Add a server-only OpenAI service adapter.
- [ ] Implement supported audio handling and audio-extraction fallback messaging for unsupported video environments.
- [ ] Implement speech-to-text with `OPENAI_TRANSCRIPTION_MODEL` (default `whisper-1`).
- [ ] Call `gpt-4o-mini` for structured `AICoachResponse` output.
- [ ] Pass transcript, challenge, current day, and strategy rules to the coach prompt.
- [ ] Validate parsed AI JSON against shared contract fields.
- [ ] Implement deterministic fallback transcript/coach output for missing API key or malformed model response.
- [ ] Render caption, private risk level, coach message, and suggested action on the result screen.
- [ ] Ensure public feed cards never show risk level.
- [ ] Verify a real or demo-fallback check-in produces a complete result.

## P0 — Feed update

- [ ] Convert public check-ins to `daily_log` feed items.
- [ ] Confirm private check-ins do not change `GET /api/feed`.
- [ ] Add a new public feed item at the top without a page reload.
- [ ] Render card challenge title, caption, Day X/Y, labeled progress, and coach snippet.
- [ ] Add **Clone template** controls to eligible feed cards.
- [ ] Confirm the feed remains populated from seeds before the first user check-in.

## P0 — Completion and Graduate loop

- [ ] Implement development guard for `POST /api/challenge/dev-complete`.
- [ ] Add clearly labelled **Dev Cheat: Complete Challenge** control in a distinct Demo tools area.
- [ ] Verify cheat action changes Day X to the template total and state to completed.
- [ ] Verify session user status changes from challenger to Graduate.
- [ ] Keep the Graduate composer inaccessible before completion.
- [ ] Implement `POST /api/graduate/report`.
- [ ] Generate an AI report from check-in captions/transcripts when available.
- [ ] Implement a deterministic report fallback for zero logs or unavailable OpenAI.
- [ ] Render challenge, themes, strengths, and carry-forward action in the Graduate view.
- [ ] Implement `POST /api/graduate/post` with 1–500 character validation.
- [ ] Publish a Graduate post and confirm it appears atop the feed as `graduate_post`.

## P0 — Error handling and safety

- [ ] Return typed `ApiError` responses for validation, invalid state, not found, and processing failures.
- [ ] Show clear inline client messages for unsupported media, upload failure, and invalid victory captions.
- [ ] Preserve user recording state after recoverable processing failures.
- [ ] Include supportive, non-diagnostic language in coaching prompts and fallbacks.
- [ ] For high/critical output, show a private safety reminder to contact trusted or local emergency/crisis support if immediate danger is possible.
- [ ] Never claim detection of an emergency, a health condition, or a diagnosis.
- [ ] Verify OpenAI key never appears in client source, build output, or API responses.

## P1 — Polish and demo resilience

- [ ] Add loading states and disabled controls for every mutation.
- [ ] Make primary flows work on a narrow mobile viewport and desktop.
- [ ] Ensure progress, risk, and status do not rely on color alone.
- [ ] Add empty-state copy for no active challenge and no feed items.
- [ ] Include a visible fallback/demo mode indicator only where helpful to presenters, not in public feed cards.
- [ ] Seed one sample transformation report for visual development.
- [ ] Verify fresh server/browser sessions return to a known demo state.

## Verification pass

- [ ] Run package type checks after dependencies are installed: `bun run typecheck`.
- [ ] Build the client: `bun --filter '@rawhabit/client' build`.
- [ ] Run server manually and exercise health/session/templates/feed endpoints.
- [ ] Test real browser permission grant, denial, and retake scenarios.
- [ ] Test private and public submission behavior.
- [ ] Test missing `OPENAI_API_KEY` fallback behavior.
- [ ] Test malformed/empty upload and no-active-challenge API errors.
- [ ] Test dev completion → report → Graduate post sequence.
- [ ] Restart server and confirm seeded demo remains coherent.

## Final demo rehearsal

- [ ] Open a clean browser profile/session.
- [ ] Select **30-Day Quit Smoking**.
- [ ] Point out the backup rules and Day 1 progress.
- [ ] Record or use the prepared demo fallback check-in.
- [ ] Show caption and tactical AI response.
- [ ] Publish publicly and show the new Day 1 feed card.
- [ ] Clone a template briefly to show the viral loop, then reset to the primary demo state.
- [ ] Trigger **Dev Cheat: Complete Challenge**.
- [ ] Show Graduate status and transformation report.
- [ ] Publish a victory post.
- [ ] End on the feed containing both raw daily progress and Graduate celebration.

## Submission handoff

- [ ] Capture a 60–90 second demo video following the final rehearsal.
- [ ] Prepare live app/repository link.
- [ ] Use the PRD’s Devpost tagline, description, and Built With list.
- [ ] Confirm all required Devpost submission fields and assets are complete before submission.
