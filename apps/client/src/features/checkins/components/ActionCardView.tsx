import type { ActionCard } from "@rawhabit/shared";

export function ActionCardView({ card, onComplete }: { card: ActionCard; onComplete: (id: string) => void }) {
  const done = card.status === "completed";
  return <section className="card action-card"><p className="eyebrow">24-hour action card</p><h2>{card.title}</h2><p>{card.instruction}</p><button onClick={() => onComplete(card.id)} disabled={done}>{done ? "Completed" : "Mark complete"}</button></section>;
}
