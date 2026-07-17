import { useState } from "react";
import type { ChallengeTemplate, TransformationReport } from "@rawhabit/shared";

interface Props {
  template: ChallengeTemplate;
  report: TransformationReport | null;
  onReport: () => void;
  onPost: (caption: string) => void;
}

export function Graduate({ template, report, onReport, onPost }: Props) {
  const [caption, setCaption] = useState("");
  return <section className="card graduate-view"><p className="eyebrow">Graduate unlocked</p><h2>You completed {template.title}.</h2>{!report ? <button onClick={onReport}>Generate my transformation report</button> : <><div className="report"><h3>What changed</h3>{report.themes.map((item) => <p key={item}>{item}</p>)}<h3>Strengths you practiced</h3>{report.strengths.map((item) => <p key={item}>{item}</p>)}<p className="action">Carry forward: {report.carryForward}</p></div><label>Victory post<textarea value={caption} maxLength={500} onChange={(event) => setCaption(event.target.value)} placeholder="What do you want to remember about this win?" /></label><button onClick={() => { onPost(caption); setCaption(""); }} disabled={!caption.trim()}>Publish victory post</button></>}</section>;
}
