import type { CheckIn } from "@rawhabit/shared";
import type { FeedbackOutcome } from "../../../shared/types";

interface Props {
  result: CheckIn | null;
  feedbackMessage: string;
  onFeedback: (action: string, outcome: FeedbackOutcome) => void;
  onPublish: (id: string) => void;
  onAdjust: () => void;
}

export function CoachResult({ result, feedbackMessage, onFeedback, onPublish, onAdjust }: Props) {
  if (!result) return null;
  const safety = result.coach.riskLevel === "high" || result.coach.riskLevel === "critical";
  const live = result.aiRun.transcription === "live" && result.aiRun.coaching === "live";
  const action = result.coach.suggestedAction ?? "the suggested action";
  return <section className="card result"><p className="eyebrow">Your coach response · {result.coach.riskLevel} support signal</p><p className={`ai-status ${live ? "live" : "fallback"}`}>{live ? "● Live OpenAI · Whisper + GPT-5.6" : `○ Demo fallback · transcription: ${result.aiRun.transcription}, coach: ${result.aiRun.coaching}`}</p><h2>{result.caption}</h2><p>{result.coach.coachMessage}</p><p className="action">Try this: {action}</p><div className="feedback-row"><button onClick={() => onFeedback(action, "accepted")}>Do it</button><button onClick={onAdjust}>Adjust my protocol</button><button onClick={() => onFeedback(action, "alternative_requested")}>Another option</button><button onClick={() => onFeedback(action, "dismissed")}>Not now</button><button onClick={() => onFeedback(action, "unhelpful")}>This wasn’t helpful</button></div>{feedbackMessage && <p className="success">{feedbackMessage}</p>}<button className="publish-progress" onClick={() => onPublish(result.id)}>Publish safe progress card</button>{safety && <p className="alert">If you may be in immediate danger, reach out to a trusted person or local emergency/crisis support.</p>}</section>;
}
