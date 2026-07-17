import type { ChallengeTemplate, SessionState } from "@rawhabit/shared";

interface Props {
  template: ChallengeTemplate;
  session: SessionState;
  onComplete: () => void;
  onCommunity: (id: string) => void;
  onEditProtocol: () => void;
}

export function ChallengeDashboard({ template, session, onComplete, onCommunity, onEditProtocol }: Props) {
  const day = session.activeChallenge!.currentDay;
  const percentage = Math.round((day / template.totalDays) * 100);
  const initiator = session.activeChallenge?.initiatedBy;
  const protocol = session.habitProtocol!;

  return <section className="active-habit"><p className="eyebrow">RawHabit Official · Your active habit</p><h2>{template.title}</h2><div className="progress-label"><span>Day {day} of {template.totalDays}</span><span>{percentage}%</span></div><div className="progress" aria-label={`${percentage}% complete`}><i style={{ width: `${percentage}%` }} /></div>{initiator && <p className="lineage">Initiated by {initiator.displayName}</p>}<div className="protocol-summary"><strong>Your Habit Protocol</strong><span>When: {protocol.trigger}</span><span>Set up: {protocol.environmentChange}</span><span>Smallest step: {protocol.minimumAction}</span><button className="community-link dark" onClick={onEditProtocol}>Edit protocol</button></div><button className="community-link dark" onClick={() => onCommunity(template.id)}>◌ People building this habit</button><p className="rules">Today’s backup: {template.strategyRules[0]}</p><div className="demo"><span>Demo tools</span><button className="secondary" onClick={onComplete}>Complete challenge</button></div></section>;
}
