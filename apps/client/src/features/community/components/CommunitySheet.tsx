import type { TemplateCommunity, TemplateParticipant } from "@rawhabit/shared";

interface Props {
  community: TemplateCommunity;
  participants: TemplateParticipant[];
  onClose: () => void;
}

export function CommunitySheet({ community, participants, onClose }: Props) {
  return <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}><section className="community-sheet" role="dialog" aria-modal="true" aria-label="People building this habit" onMouseDown={(event) => event.stopPropagation()}><button className="sheet-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">RawHabit Official</p><h2>People building this habit</h2><p>{community.participantCount} people have chosen this challenge.</p>{participants.length === 0 ? <p className="empty-state">No one is listed yet. You can be the first visible member.</p> : <div className="participant-grid">{participants.map((person) => <article key={person.userId} className="participant"><span className="avatar">{person.displayName.slice(0, 1)}</span><strong>{person.displayName}</strong><small>Joined the circle</small></article>)}</div>}</section></div>;
}
