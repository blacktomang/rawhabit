# RawHabit AI — Product Requirements Document

**Hackathon:** OpenAI Build Week · Apps for Your Life  
**Product:** RawHabit AI  
**Scope:** Web-only, in-memory MVP

## Product summary

RawHabit is a privacy-first social habit app for the unpolished middle of change. People record a 15–30 second daily audio/video check-in, receive a concrete GPT-5.6 accountability response, and choose whether to share a safe progress update. Templates form visible communities: people can see who is building the same habit, clone a challenge, and join its participant circle without exposing their raw check-ins.

**Promise:** Be raw with your coach; share progress with your people.

## Problem

Most habit trackers count streaks but do not help in the moment someone is avoiding a workout, craving a cigarette, or reaching for their phone at midnight. Purely public social apps can make those moments feel performative. RawHabit gives people a private place to be honest, then lets them participate in a community on their terms.

## Target user

Maya, 27, is trying to quit smoking. After a craving, she records a candid 20-second check-in. The Accountability Agent gives her one immediate next action. Maya can keep it private, share a short AI-assisted progress caption, or join an optional visible group of people doing the same 30-day challenge.

## Goals

1. Make daily honesty faster and more useful than filling in a habit tracker.
2. Demonstrate GPT-5.6 as an accountable, tool-using planning agent—not just a chat box.
3. Create social motivation through template communities while keeping vulnerable media private by default.
4. Make completion meaningful: Graduate status unlocks reflection and free-form victory posts.

## Core loop

```text
Choose a template → join its community → record a private raw check-in
→ transcribe → Saboteur assessment → Coach plan/action card
→ optionally share a safe progress update → complete → Graduate report/post
```

## Functional requirements

### 1. Challenge templates and community

The MVP includes three templates:

- 30-Day Quit Smoking
- 21-Day Gym Consistency
- 14-Day Screen-Free Nights

Each template includes a duration, description, and strategy rules. A template card and challenge dashboard show an avatar stack and participant count: “Alex, Jordan, and 28 others are building this.” Selecting it opens a **People building this habit** sheet with only opted-in participants.

Users can clone a public template from a feed post. The resulting challenge stores source attribution, e.g. “Initiated by Alex’s Day 8 check-in.” Cloning does not reveal Alex’s raw media, transcript, or AI assessment.

### 2. Daily raw check-in

Users record 15–30 seconds with browser `MediaRecorder`, preview or retake it, and submit it as private by default. Audio-only and a development transcript fallback support demo reliability. Users may explicitly publish a safe caption/progress card after reviewing the agent response.

### 3. Accountability Agent

The server transcribes audio with `whisper-1`, then calls GPT-5.6 through the Responses API. The experience has two explainable stages in one awaited agent response:

- **Saboteur:** identifies friction patterns, excuses, and a private support-routing label (`low`, `medium`, `high`, `critical`).
- **Coach:** asks a concise Socratic question, gives one practical strategy-compatible action, and may propose a temporary 24-hour action card or protocol adjustment.

The UI returns one combined result after both stages finish. This is foreground work during submission, not a background job, keeping the MVP simple and demoable.

### 4. Agent actions and consent

The model proposes actions through strict function schemas; the server validates and executes them. An action card may be created automatically only for the current user and expires after 24 hours. Any schedule/grace-day change requires user confirmation.

There is no Discord/community-alert integration in this MVP. For high-support moments, the user gets private immediate-support guidance and may optionally publish a generic **Encouragement welcome** signal. Public posts never display a risk level, private transcript evidence, or diagnostic claim.

### 5. Public feed

The feed begins with fictional seeded cards and includes explicitly public user progress posts. Cards show challenge name, Day X of Y, progress, a short coach note, source attribution when cloned, and a template-community avatar/count control. It does not show raw risk data.

### 6. Completion and Graduate status

The demo-only Dev Cheat completes an active challenge. Completion changes the participant to Graduate, generates a short transformation report from their summaries, and unlocks the victory composer. A Graduate post appears in the public feed when the user publishes it.

## Safety and privacy boundaries

- Raw media, transcript, assessment evidence, and risk labels are private by default.
- Template-participant visibility is opt-in and is independent of feed visibility.
- The app is supportive, not diagnostic; it makes no treatment or emergency-detection claims.
- High/critical language receives a gentle prompt to contact a trusted person or local emergency/crisis service if there may be immediate danger.
- The model cannot autonomously disclose data or make external social posts.

## MVP boundaries

Included: hardcoded session, in-memory data, seeded fictional feed, local media storage, development fallback, dev completion control, and an optional generic public encouragement signal.

Excluded: authentication, database persistence, real DMs/comments/likes, real moderation, Discord integration, medical/crisis response, and automatic public sharing.

## Demo success criteria

1. Start a template and view its participant community.
2. Record or use the transcript fallback and receive a Saboteur/Coach response.
3. Display and complete a 24-hour action card.
4. Publish a harmless progress update and show it atop the feed.
5. Clone a template and show its initiator attribution plus community count.
6. Use Dev Cheat, generate the Graduate report, and publish a victory post.

## Build Week submission readiness

The delivered project must be runnable with sample/demo data, use Codex and GPT-5.6, document setup in a README, and have a sub-three-minute demo video that shows the app working and explains the Codex/GPT-5.6 use.
