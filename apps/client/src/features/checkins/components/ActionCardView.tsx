import type { ActionCard } from "@rawhabit/shared";

export function ActionCardView({ card, onComplete }: { card: ActionCard; onComplete: (id: string) => void }) {
  const done = card.status === "completed";
  const expired = card.status === "expired";
  return <section className="card action-card"><p className="eyebrow">24-hour action card</p><h2>{card.title}</h2><p>{card.instruction}</p><p className="expiry">{expired ? "This card has expired." : `Available until ${new Date(card.expiresAt).toLocaleString()}`}</p><button onClick={() => onComplete(card.id)} disabled={done || expired}>{done ? "Completed" : expired ? "Expired" : "Mark complete"}</button></section>;
}
