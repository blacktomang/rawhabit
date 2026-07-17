import { useEffect, useState } from "react";
import type { ActionCard, ChallengeTemplate, CheckIn, CheckInJob, FeedItem, HabitProtocol, SessionState, TemplateCommunity, TemplateParticipant, TransformationReport, Visibility } from "@rawhabit/shared";
import { mutate, getJson } from "./api";
import { ChallengeDashboard } from "../features/challenges/components/ChallengeDashboard";
import { HabitProtocolSetup } from "../features/challenges/components/HabitProtocolSetup";
import { TemplatePicker } from "../features/challenges/components/TemplatePicker";
import { ActionCardView } from "../features/checkins/components/ActionCardView";
import { CoachResult } from "../features/checkins/components/CoachResult";
import { Recorder } from "../features/checkins/components/Recorder";
import { CommunitySheet } from "../features/community/components/CommunitySheet";
import { Feed } from "../features/feed/components/Feed";
import { Graduate } from "../features/graduation/components/Graduate";
import type { FeedbackOutcome } from "../shared/types";

export function App() {
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [result, setResult] = useState<CheckIn | null>(null);
  const [report, setReport] = useState<TransformationReport | null>(null);
  const [community, setCommunity] = useState<{ data: TemplateCommunity; participants: TemplateParticipant[] } | null>(null);
  const [editingProtocol, setEditingProtocol] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingStage, setProcessingStage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [error, setError] = useState("");
  const template = templates.find((item) => item.id === session?.activeChallenge?.templateId);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    try {
      const [nextSession, nextTemplates, nextFeed] = await Promise.all([getJson<SessionState>("/api/session"), getJson<ChallengeTemplate[]>("/api/templates"), getJson<FeedItem[]>("/api/feed")]);
      setSession(nextSession); setTemplates(nextTemplates); setFeed(nextFeed); setReport(nextSession.report);
    } catch (cause) { setError((cause as Error).message); } finally { setLoading(false); }
  }

  async function start(templateId: string) {
    try { setError(""); setSession(await mutate<SessionState>("/api/challenge/start", json({ templateId }))); setEditingProtocol(false); setResult(null); setReport(null); } catch (cause) { setError((cause as Error).message); }
  }
  async function clone(feedItemId: string) {
    try { setError(""); setSession(await mutate<SessionState>(`/api/feed/${feedItemId}/clone`, { method: "POST" })); setEditingProtocol(false); setResult(null); setReport(null); } catch (cause) { setError((cause as Error).message); }
  }
  async function openCommunity(templateId: string) {
    try { setError(""); const [data, participants] = await Promise.all([getJson<TemplateCommunity>(`/api/templates/${templateId}/community`), getJson<TemplateParticipant[]>(`/api/templates/${templateId}/participants`)]); setCommunity({ data, participants }); } catch (cause) { setError((cause as Error).message); }
  }
  async function submit(audio: Blob | null, video: Blob | null, transcript: string, visibility: Visibility) {
    try {
      setError("");
      const upload = video ? await mutate<{ mediaUrl: string }>("/api/media", { method: "POST", headers: { "Content-Type": video.type || "video/webm" }, body: video }) : undefined;
      const query = new URLSearchParams({ visibility, ...(transcript ? { demoTranscript: transcript } : {}), ...(upload ? { mediaUrl: upload.mediaUrl } : {}) });
      const job = await mutate<{ jobId: string }>(`/api/check-ins?${query}`, { method: "POST", headers: audio ? { "Content-Type": audio.type || "audio/webm" } : { "Content-Type": "application/json" }, body: audio ?? undefined });
      await awaitCoachResult(job.jobId);
    } catch (cause) { setError((cause as Error).message); }
  }
  async function awaitCoachResult(jobId: string) {
    setProcessingStage("Listening to your check-in…");
    await new Promise<void>((resolve, reject) => {
      const stream = new EventSource(`/api/check-in-jobs/${jobId}/events`);
      const stage = (label: string) => () => setProcessingStage(label);
      const complete = (data: { checkIn: CheckIn; actionCard: ActionCard }) => { setResult(data.checkIn); setSession((current) => current ? { ...current, activeActionCard: data.actionCard } : current); setProcessingStage(""); stream.close(); resolve(); };
      stream.addEventListener("transcript_ready", stage("Finding the friction…"));
      stream.addEventListener("coach_ready", stage("Building your next step…"));
      stream.addEventListener("complete", (event) => complete(JSON.parse((event as MessageEvent).data) as { checkIn: CheckIn; actionCard: ActionCard }));
      stream.addEventListener("failed", (event) => { setProcessingStage(""); stream.close(); reject(new Error(JSON.parse((event as MessageEvent).data).error ?? "Processing failed")); });
      stream.onerror = () => { stream.close(); void pollForResult(jobId).then(complete).then(resolve).catch(reject); };
    });
  }
  async function pollForResult(jobId: string) {
    try {
      const current = await getJson<CheckInJob>(`/api/check-in-jobs/${jobId}`);
      if (current.status === "complete" && current.result) return current.result;
      if (current.status === "failed") throw new Error(current.error ?? "Processing failed");
      throw new Error("Live coaching connection was interrupted. Please try again.");
    } finally { setProcessingStage(""); }
  }
  async function completeChallenge() { try { setError(""); setSession(await mutate<SessionState>("/api/challenge/dev-complete", { method: "POST" })); } catch (cause) { setError((cause as Error).message); } }
  async function generateReport() { try { setError(""); setReport(await mutate<TransformationReport>("/api/graduate/report", { method: "POST" })); } catch (cause) { setError((cause as Error).message); } }
  async function victory(caption: string) { try { setError(""); const item = await mutate<FeedItem>("/api/graduate/post", json({ caption })); setFeed((items) => [item, ...items]); } catch (cause) { setError((cause as Error).message); } }
  async function completeActionCard(id: string) { try { setError(""); const card = await mutate<ActionCard>(`/api/action-cards/${id}/complete`, { method: "POST" }); setSession((current) => current ? { ...current, activeActionCard: card } : current); } catch (cause) { setError((cause as Error).message); } }
  async function publishCheckIn(id: string) { try { setError(""); const item = await mutate<FeedItem>(`/api/check-ins/${id}/publish`, { method: "POST" }); setFeed((items) => items.some((existing) => existing.id === item.id) ? items : [item, ...items]); } catch (cause) { setError((cause as Error).message); } }
  async function sendFeedback(action: string, outcome: FeedbackOutcome) { try { setError(""); const response = await mutate<{ storedForNextCoachRun: boolean }>(`/api/check-ins/${result?.id}/feedback`, json({ action, outcome })); if (response.storedForNextCoachRun) setFeedbackMessage("Saved. Your next coaching response will use this feedback."); } catch (cause) { setError((cause as Error).message); } }
  async function saveProtocol(values: Omit<HabitProtocol, "templateId" | "primaryPrinciple" | "updatedAt">) { try { setError(""); const protocol = await mutate<HabitProtocol>("/api/challenge/protocol", json(values)); setSession((current) => current ? { ...current, habitProtocol: protocol } : current); setEditingProtocol(false); } catch (cause) { setError((cause as Error).message); } }

  if (loading) return <main className="shell loading-state"><p className="eyebrow">RawHabit</p><h1>Finding your people…</h1><div className="skeleton-card" /><div className="skeleton-card short" /></main>;
  return <><a className="skip-link" href="#main-content">Skip to feed</a><header className="topbar"><div className="topbar-inner"><a className="wordmark" href="/" aria-label="RawHabit home">raw<span>habit</span></a><nav aria-label="Primary navigation"><span className="nav-current">Home</span><span>Challenges</span><span>Graduates</span></nav><div className="profile-chip"><span className="avatar maya">M</span><span>{session?.user.status === "graduate" ? "Graduate" : "Maya’s space"}</span></div></div></header><main className="shell" id="main-content">{error && <p className="alert">{error}</p>}<div className="home-grid"><section className="feed-column"><div className="feed-intro"><p className="eyebrow">The honest feed</p><h1>Progress is better when it’s <em>seen.</em></h1><p>Small reports from people doing the work, in public and without the highlight reel.</p></div><Feed feed={feed} onClone={clone} /></section><aside className="habit-rail" aria-label="Your habit space">{!session?.activeChallenge && <TemplatePicker templates={templates} onStart={start} onCommunity={openCommunity} />}{session?.activeChallenge && template && session.user.status === "challenger" && <>{!session.habitProtocol || editingProtocol ? <HabitProtocolSetup template={template} protocol={session.habitProtocol} onSave={saveProtocol} /> : <ChallengeDashboard template={template} session={session} onComplete={completeChallenge} onCommunity={openCommunity} onEditProtocol={() => setEditingProtocol(true)} />}<Recorder onSubmit={submit} processingStage={processingStage} /><CoachResult result={result} feedbackMessage={feedbackMessage} onFeedback={sendFeedback} onPublish={publishCheckIn} onAdjust={() => setEditingProtocol(true)} />{session.activeActionCard && <ActionCardView card={session.activeActionCard} onComplete={completeActionCard} />}</>}{session?.user.status === "graduate" && template && <Graduate template={template} report={report} onReport={generateReport} onPost={victory} />}<p className="rail-note">RawHabit is for support, not diagnosis. If you’re in immediate danger, contact local emergency support.</p></aside></div>{community && <CommunitySheet community={community.data} participants={community.participants} onClose={() => setCommunity(null)} />}</main></>;
}

function json(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
