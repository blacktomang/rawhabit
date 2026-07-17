import { useState } from "react";
import type { ChallengeTemplate, HabitProtocol } from "@rawhabit/shared";

interface Props {
  template: ChallengeTemplate;
  protocol: HabitProtocol | null;
  onSave: (values: Omit<HabitProtocol, "templateId" | "primaryPrinciple" | "updatedAt">) => Promise<void>;
}

export function HabitProtocolSetup({ template, protocol, onSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ trigger: protocol?.trigger ?? template.protocolSetup.questions.find((question) => question.id === "trigger")?.options[0] ?? "", environmentChange: protocol?.environmentChange ?? template.protocolSetup.questions.find((question) => question.id === "environmentChange")?.options[0] ?? "", minimumAction: protocol?.minimumAction ?? template.protocolSetup.questions.find((question) => question.id === "minimumAction")?.options[0] ?? "" }));
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); await onSave({ trigger: answers.trigger, environmentChange: answers.environmentChange, minimumAction: answers.minimumAction }); setSaving(false); };

  return <section className="card protocol-setup"><p className="eyebrow">Make this work in your real life</p><h2>{protocol ? "Edit your Habit Protocol" : "Set your Habit Protocol"}</h2><p>{template.direction === "build" ? "Make the good habit easy to see and do." : "Make the unwanted habit less visible and harder to do."}</p>{template.protocolSetup.questions.map((question) => <label key={question.id}>{question.label}<select value={answers[question.id]} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}>{question.options.map((option) => <option key={option}>{option}</option>)}</select></label>)}<button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save my protocol"}</button></section>;
}
