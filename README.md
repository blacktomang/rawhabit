# RawHabit AI

RawHabit is a privacy-first community habit app. Record a brief private check-in, receive a practical AI accountability response, and choose whether to share a safe progress update with people building the same official challenge.

## Demo capabilities

- Three versioned **RawHabit Official** templates: Quit Smoking, Gym Consistency, and Screen-Free Nights.
- Private-by-default 15–30 second browser video/audio check-ins with a transcript fallback.
- OpenAI transcription (`whisper-1`) and GPT-5.6 Responses API coaching when an API key is available.
- Deterministic local fallback coaching for reliable demos without an API key.
- Public feed posts only after user choice; raw transcript and support signal remain private.
- Template communities, source-aware clones, and Graduate completion/report flow.

## Run locally

Requires Bun 1.2.19 or later.

```bash
bun install
cp .env.example .env
bun dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`.

## Environment

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
OPENAI_TRANSCRIPTION_MODEL=whisper-1
ALLOW_DEV_CHEAT=true
```

Without `OPENAI_API_KEY`, choose the Demo transcript field in the recorder and the app will use deterministic fallback responses.

## Demo script

1. Join an Official template and open its participant community.
2. Submit a demo transcript about a difficult moment.
3. Review the private coach response, then share the safe caption to the feed.
4. Clone a feed challenge and show its initiator attribution.
5. Use **Advance to next day** after a check-in; the virtual challenge date and private journey progress together. On the final completed day, generate a report and publish a Graduate post.

## Architecture

`apps/client` is React/Vite, `apps/server` is Express on Bun, and `packages/shared` owns cross-app TypeScript contracts. The server owns all OpenAI requests and keeps the MVP session/data in memory.

## Codex and GPT-5.6

Codex was used to shape and implement the shared contracts, official-template community model, media flow, and server orchestration. GPT-5.6 is the server-side Accountability Agent: it receives the transcript, challenge protocol, and explicit action preferences, then returns a structured coaching response. The server validates the output and never lets the model publish social content directly.
