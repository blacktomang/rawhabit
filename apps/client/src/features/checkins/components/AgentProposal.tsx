import type { AgentAction } from "@rawhabit/shared";

export function AgentProposal({ action, onResolve }: { action: AgentAction; onResolve: (id: string, accepted: boolean) => void }) {
  const message = typeof action.proposedPayload.message === "string" ? action.proposedPayload.message : "Review this proposed coaching action.";
  const title = action.kind === "mutate_challenge_protocol" ? "Review a protocol change" : "Invite gentle encouragement";
  return <section className="card agent-proposal"><p className="eyebrow">Coach proposal · your choice</p><h2>{title}</h2><p>{message}</p><p className="private-note">Nothing changes until you confirm.</p><div className="feedback-row"><button onClick={() => onResolve(action.id, true)}>Confirm</button><button className="secondary" onClick={() => onResolve(action.id, false)}>Not now</button></div></section>;
}
