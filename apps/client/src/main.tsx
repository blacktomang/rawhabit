import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ChallengeTemplate, CheckIn, FeedItem, SessionState, TransformationReport, Visibility } from "@rawhabit/shared";
import "./styles.css";

const getJson = <T,>(path: string) => fetch(path).then(async (response) => {
  if (!response.ok) throw new Error((await response.json()).error ?? "Request failed");
  return response.json() as Promise<T>;
});

function App() {
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [result, setResult] = useState<CheckIn | null>(null);
  const [report, setReport] = useState<TransformationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const template = templates.find((item) => item.id === session?.activeChallenge?.templateId);

  const refresh = async () => {
    const [nextSession, nextTemplates, nextFeed] = await Promise.all([getJson<SessionState>("/api/session"), getJson<ChallengeTemplate[]>("/api/templates"), getJson<FeedItem[]>("/api/feed")]);
    setSession(nextSession); setTemplates(nextTemplates); setFeed(nextFeed); setReport(nextSession.report);
  };
  useEffect(() => { refresh().catch((cause) => setError(cause.message)).finally(() => setLoading(false)); }, []);
  const mutate = async (path: string, options?: RequestInit) => {
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    let response: Response;
    try {
      response = await fetch(path, { ...options, signal: controller.signal });
    } catch (cause) {
      if ((cause as Error).name === "AbortError") throw new Error("Coaching took too long. Check that the server is running, then try again.");
      throw new Error("We couldn’t reach the coaching server. Check that bun dev is running, then try again.");
    } finally {
      window.clearTimeout(timeout);
    }
    if (!response.ok) throw new Error((await response.json()).error ?? "Something went wrong");
    return response.json();
  };
  const start = async (templateId: string) => { try { setSession(await mutate("/api/challenge/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId }) })); setResult(null); setReport(null); } catch (cause) { setError((cause as Error).message); } };
  const clone = async (templateId: string) => { try { setSession(await mutate(`/api/templates/${templateId}/clone`, { method: "POST" })); setResult(null); setReport(null); } catch (cause) { setError((cause as Error).message); } };
  const submit = async (blob: Blob | null, transcript: string, visibility: Visibility) => {
    try {
      const query = new URLSearchParams({ visibility, ...(transcript ? { demoTranscript: transcript } : {}) });
      const checkIn = await mutate(`/api/check-ins?${query}`, { method: "POST", headers: blob ? { "Content-Type": blob.type || "audio/webm" } : { "Content-Type": "application/json" }, body: blob ?? undefined }) as { checkIn: CheckIn; feedItem?: FeedItem };
      setResult(checkIn.checkIn); if (checkIn.feedItem) setFeed((items) => [checkIn.feedItem!, ...items]);
    } catch (cause) { setError((cause as Error).message); }
  };
  const complete = async () => { try { setSession(await mutate("/api/challenge/dev-complete", { method: "POST" })); } catch (cause) { setError((cause as Error).message); } };
  const generateReport = async () => { try { const next = await mutate("/api/graduate/report", { method: "POST" }) as TransformationReport; setReport(next); } catch (cause) { setError((cause as Error).message); } };
  const victory = async (caption: string) => { try { const item = await mutate("/api/graduate/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption }) }) as FeedItem; setFeed((items) => [item, ...items]); } catch (cause) { setError((cause as Error).message); } };

  if (loading) return <main className="shell loading-state"><p className="eyebrow">RawHabit</p><h1>Finding your people…</h1><div className="skeleton-card" /><div className="skeleton-card short" /></main>;
  return <><a className="skip-link" href="#main-content">Skip to feed</a><header className="topbar"><div className="topbar-inner"><a className="wordmark" href="/" aria-label="RawHabit home">raw<span>habit</span></a><nav aria-label="Primary navigation"><span className="nav-current">Home</span><span>Challenges</span><span>Graduates</span></nav><div className="profile-chip"><span className="avatar maya">M</span><span>{session?.user.status === "graduate" ? "Graduate" : "Maya’s space"}</span></div></div></header><main className="shell" id="main-content">
    {error && <p className="alert">{error}</p>}
    <div className="home-grid"><section className="feed-column"><div className="feed-intro"><p className="eyebrow">The honest feed</p><h1>Progress is better when it’s <em>seen.</em></h1><p>Small reports from people doing the work, in public and without the highlight reel.</p></div><Feed feed={feed} onClone={clone} /></section><aside className="habit-rail" aria-label="Your habit space">
      {!session?.activeChallenge && <TemplatePicker templates={templates} onStart={start} />}
      {session?.activeChallenge && template && session.user.status === "challenger" && <><ChallengeDashboard template={template} session={session} onComplete={complete} /><Recorder onSubmit={submit} /><CoachResult result={result} /></>}
      {session?.user.status === "graduate" && template && <Graduate template={template} report={report} onReport={generateReport} onPost={victory} />}
      <p className="rail-note">RawHabit is for support, not diagnosis. If you’re in immediate danger, contact local emergency support.</p>
    </aside></div>
  </main></>;
}

function TemplatePicker({ templates, onStart }: { templates: ChallengeTemplate[]; onStart: (id: string) => void }) { return <section className="join-panel"><div className="panel-kicker"><span className="tiny-dot" /> Start something real</div><h2>Your next honest day starts here.</h2><p className="muted">Choose a shared challenge. Make it yours in one tap.</p><div className="challenge-list">{templates.map((template, index) => <article className="challenge-option" key={template.id}><div className={`challenge-mark mark-${index}`}>{template.totalDays}</div><div><h3>{template.title}</h3><p>{template.strategyRules[0]}</p></div><button className="text-button" onClick={() => onStart(template.id)}>Join <span aria-hidden="true">→</span></button></article>)}</div></section>; }
function ChallengeDashboard({ template, session, onComplete }: { template: ChallengeTemplate; session: SessionState; onComplete: () => void }) { const day = session.activeChallenge!.currentDay; const percentage = Math.round((day / template.totalDays) * 100); return <section className="active-habit"><p className="eyebrow">Your active habit</p><h2>{template.title}</h2><div className="progress-label"><span>Day {day} of {template.totalDays}</span><span>{percentage}%</span></div><div className="progress" aria-label={`${percentage}% complete`}><i style={{ width: `${percentage}%` }} /></div><p className="rules">Today’s backup: {template.strategyRules[0]}</p><div className="demo"><span>Demo tools</span><button className="secondary" onClick={onComplete}>Complete challenge</button></div></section>; }
function Recorder({ onSubmit }: { onSubmit: (blob: Blob | null, transcript: string, visibility: Visibility) => Promise<void> }) {
  const [stream, setStream] = useState<MediaStream | null>(null); const [recorder, setRecorder] = useState<MediaRecorder | null>(null); const [blob, setBlob] = useState<Blob | null>(null); const [seconds, setSeconds] = useState(0); const [visibility, setVisibility] = useState<Visibility>("private"); const [demoTranscript, setDemoTranscript] = useState(""); const [busy, setBusy] = useState(false); const timer = useRef<number | null>(null);
  const stop = () => recorder?.state === "recording" && recorder.stop();
  const record = async () => { const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); const chunks: BlobPart[] = []; const next = new MediaRecorder(nextStream); next.ondataavailable = (event) => chunks.push(event.data); next.onstop = () => { setBlob(new Blob(chunks, { type: next.mimeType })); nextStream.getTracks().forEach((track) => track.stop()); setStream(null); if (timer.current) window.clearInterval(timer.current); }; setStream(nextStream); setRecorder(next); setSeconds(0); next.start(); timer.current = window.setInterval(() => setSeconds((value) => { if (value >= 29) { next.stop(); return 30; } return value + 1; }), 1000); };
  const send = async () => { setBusy(true); await onSubmit(blob, demoTranscript, visibility); setBusy(false); };
  return <section className="card recorder"><p className="eyebrow">Daily raw log</p><h2>Record the real moment.</h2>{!stream && !blob && <button onClick={() => record().catch(() => setDemoTranscript("I had a difficult moment today, but I chose to pause and check in."))}>Record today’s raw log</button>}{stream && <><p className="recording">● Recording {seconds}s / 30s</p><button className="secondary" onClick={stop} disabled={seconds < 15}>Stop recording</button>{seconds < 15 && <small>Keep going for {15 - seconds} seconds.</small>}</>}{blob && <p className="success">Recording ready. Add a transcript for reliable demo mode, then submit.</p>}<label>Demo transcript / recording note<textarea value={demoTranscript} onChange={(event) => setDemoTranscript(event.target.value)} placeholder="Optional: describe your check-in for a reliable demo fallback." /></label><div className="row"><label><input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} /> Private</label><label><input type="radio" checked={visibility === "public"} onChange={() => setVisibility("public")} /> Share to feed</label></div><button onClick={send} disabled={busy || (!blob && !demoTranscript)}>{busy ? "Coaching…" : "Get my coach response"}</button></section>;
}
function CoachResult({ result }: { result: CheckIn | null }) { if (!result) return null; const safety = result.coach.riskLevel === "high" || result.coach.riskLevel === "critical"; const live = result.aiRun.transcription === "live" && result.aiRun.coaching === "live"; return <section className="card result"><p className="eyebrow">Your coach response · {result.coach.riskLevel} support signal</p><p className={`ai-status ${live ? "live" : "fallback"}`}>{live ? "● Live OpenAI · Whisper + GPT-4o mini" : `○ Demo fallback · transcription: ${result.aiRun.transcription}, coach: ${result.aiRun.coaching}`}</p><h2>{result.caption}</h2><p>{result.coach.coachMessage}</p><p className="action">Try this: {result.coach.suggestedAction}</p>{safety && <p className="alert">If you may be in immediate danger, reach out to a trusted person or local emergency/crisis support.</p>}</section>; }
function Graduate({ template, report, onReport, onPost }: { template: ChallengeTemplate; report: TransformationReport | null; onReport: () => void; onPost: (caption: string) => void }) { const [caption, setCaption] = useState(""); return <section className="card graduate-view"><p className="eyebrow">Graduate unlocked</p><h2>You completed {template.title}.</h2>{!report ? <button onClick={onReport}>Generate my transformation report</button> : <><div className="report"><h3>What changed</h3>{report.themes.map((item) => <p key={item}>{item}</p>)}<h3>Strengths you practiced</h3>{report.strengths.map((item) => <p key={item}>{item}</p>)}<p className="action">Carry forward: {report.carryForward}</p></div><label>Victory post<textarea value={caption} maxLength={500} onChange={(event) => setCaption(event.target.value)} placeholder="What do you want to remember about this win?" /></label><button onClick={() => { onPost(caption); setCaption(""); }} disabled={!caption.trim()}>Publish victory post</button></>}</section>; }
function Feed({ feed, onClone }: { feed: FeedItem[]; onClone: (id: string) => void }) { return <section className="feed" aria-label="Challenge feed"><div className="feed-heading"><h2>Today in the circle</h2><span>{feed.length} check-ins</span></div>{feed.map((item, index) => { const progress = item.currentDay && item.totalDays ? Math.round((item.currentDay / item.totalDays) * 100) : 100; const initial = item.authorName.slice(0, 1); return <article className={`feed-item post-${index % 3}`} key={item.id}><div className="post-author"><span className={`avatar avatar-${index % 4}`}>{initial}</span><div><strong>{item.authorName}</strong><p>{item.kind === "graduate_post" ? "Graduated today" : item.challengeTitle}</p></div><time dateTime={item.createdAt}>{index === 0 ? "just now" : `${index + 1}h ago`}</time></div><div className="post-visual"><span className="visual-day">{item.kind === "graduate_post" ? "Made it" : `Day ${item.currentDay}`}</span><span className="visual-word">raw<br />work</span></div><p className="post-caption">{item.caption}</p>{item.currentDay && <div className="post-progress"><div className="progress-label"><span>Day {item.currentDay} of {item.totalDays}</span><span>{progress}%</span></div><div className="progress"><i style={{ width: `${progress}%` }} /></div></div>}{item.coachSnippet && <p className="coach-snippet">Coach note: {item.coachSnippet}</p>}<div className="post-actions"><span>◌ Honest check-in</span>{item.templateId && <button className="text-button" onClick={() => onClone(item.templateId!)}>Join this habit <span aria-hidden="true">→</span></button>}</div></article>; })}</section>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
