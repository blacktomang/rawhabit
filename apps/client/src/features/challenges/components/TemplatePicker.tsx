import type { ChallengeTemplate } from "@rawhabit/shared";

interface Props {
  templates: ChallengeTemplate[];
  onStart: (id: string) => void;
  onCommunity: (id: string) => void;
}

export function TemplatePicker({ templates, onStart, onCommunity }: Props) {
  return <section className="join-panel"><div className="panel-kicker"><span className="tiny-dot" /> Start something real</div><h2>Your next honest day starts here.</h2><p className="muted">Choose a shared challenge. Make it yours in one tap.</p><div className="challenge-list">{templates.map((template, index) => <article className="challenge-option" key={template.id}><div className={`challenge-mark mark-${index}`}>{template.totalDays}</div><div><p className="official">RawHabit Official</p><h3>{template.title}</h3><p>{template.strategyRules[0]}</p><button className="community-link" onClick={() => onCommunity(template.id)}>See people building this</button></div><button className="text-button" onClick={() => onStart(template.id)}>Join <span aria-hidden="true">→</span></button></article>)}</div></section>;
}
