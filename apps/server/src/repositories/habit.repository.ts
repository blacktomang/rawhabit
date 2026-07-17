import type { ActionCard, AgentPreference, ChallengeInitiator, ChallengeTemplate, CheckIn, CheckInJob, CheckInJobEvent, CheckInJobStatus, FeedItem, HabitProtocol, SessionState, TemplateCommunity, TemplateParticipant, TransformationReport } from "@rawhabit/shared";

const templates: ChallengeTemplate[] = [
  { id: "quit-smoking-30", source: "official", version: 1, direction: "reduce", protocolSetup: { primaryPrinciple: "make_difficult", questions: [{ id: "trigger", label: "When is the hardest trigger?", options: ["With coffee", "After meals", "During stress", "In social situations"] }, { id: "environmentChange", label: "Where can we add friction?", options: ["Remove cigarettes and lighters", "Avoid the store route", "Keep gum and water visible", "Set a 10-minute delay"] }, { id: "minimumAction", label: "What replaces the urge?", options: ["Drink water", "Chew gum", "Text someone", "Take a short walk"] }] }, title: "30-Day Quit Smoking", totalDays: 30, description: "Build a smoke-free day, one honest check-in at a time.", strategyRules: ["Drink water and take a 10-minute walk after a craving.", "Text an accountability contact before buying cigarettes.", "If you slip, record it honestly and restart tomorrow without self-judgment."] },
  { id: "gym-21", source: "official", version: 1, direction: "build", protocolSetup: { primaryPrinciple: "make_easy", questions: [{ id: "trigger", label: "What context works best?", options: ["After coffee", "Before work", "After work", "After dinner"] }, { id: "environmentChange", label: "What can you make easier tonight?", options: ["Lay out clothes", "Pack a gym bag", "Put shoes by the door", "Add it to my calendar"] }, { id: "minimumAction", label: "What is your smallest valid action?", options: ["Put on gym shoes", "Walk outside", "Move for 10 minutes", "Enter the gym"] }] }, title: "21-Day Gym Consistency", totalDays: 21, description: "Make movement a small, repeatable promise.", strategyRules: ["Lay out workout clothes the night before.", "Commit to just 10 minutes when motivation is low."] },
  { id: "screen-free-14", source: "official", version: 1, direction: "reduce", protocolSetup: { primaryPrinciple: "make_invisible", questions: [{ id: "trigger", label: "When does scrolling start?", options: ["After dinner", "In bed", "During a break", "When I feel stressed"] }, { id: "environmentChange", label: "What can you remove from sight?", options: ["Charge phone outside bedroom", "Put phone in a drawer", "Turn on app limits", "Leave phone in another room"] }, { id: "minimumAction", label: "What replaces the scroll?", options: ["Read one page", "Make tea", "Write one line", "Listen to one song"] }] }, title: "14-Day Screen-Free Nights", totalDays: 14, description: "Protect your wind-down ritual from the scroll.", strategyRules: ["Charge your phone outside the bedroom.", "Replace late scrolling with one page of a book."] },
];

const now = () => new Date().toISOString();

export class HabitRepository {
  private session: SessionState = {
    user: { id: "maya", displayName: "Maya", status: "challenger", adaptiveProtocolEnabled: false, participantVisibility: "listed" },
    activeChallenge: null,
    activeActionCard: null,
    habitProtocol: null,
    report: null,
  };
  private checkIns: CheckIn[] = [];
  private checkInJobs = new Map<string, CheckInJob>();
  private jobListeners = new Map<string, Set<(event: CheckInJobEvent) => void>>();
  private preferences = new Map<string, AgentPreference>([["maya", { acceptedActionTypes: [], rejectedActionTypes: [], constraints: [], recentFeedback: [] }]]);
  private participants: TemplateParticipant[] = [
    { userId: "alex", templateId: "gym-21", displayName: "Alex", joinedAt: now(), visibility: "listed", sourceFeedItemId: "seed-1" },
    { userId: "riley", templateId: "gym-21", displayName: "Riley", joinedAt: now(), visibility: "listed" },
    { userId: "jordan", templateId: "screen-free-14", displayName: "Jordan", joinedAt: now(), visibility: "listed", sourceFeedItemId: "seed-2" },
  ];
  private feed: FeedItem[] = [
    { id: "seed-1", kind: "daily_log", authorName: "Alex", templateId: "gym-21", challengeTitle: "21-Day Gym Consistency", currentDay: 8, totalDays: 21, caption: "Showed up for 10 minutes. That was enough today.", coachSnippet: "Protect the next small promise.", createdAt: new Date(Date.now() - 3_600_000).toISOString() },
    { id: "seed-2", kind: "daily_log", authorName: "Jordan", templateId: "screen-free-14", challengeTitle: "14-Day Screen-Free Nights", currentDay: 5, totalDays: 14, caption: "Phone stayed outside the bedroom again.", coachSnippet: "Keep the cue visible.", createdAt: new Date(Date.now() - 7_200_000).toISOString() },
  ];

  listTemplates() { return templates; }
  findTemplate(id: string) { return templates.find((template) => template.id === id); }
  getSession() { return this.session; }
  getFeed() { return this.feed; }
  findFeedItem(id: string) { return this.feed.find((item) => item.id === id); }
  getActiveTemplate() { return this.session.activeChallenge && this.findTemplate(this.session.activeChallenge.templateId); }
  getPreference() { return this.preferences.get(this.session.user.id)!; }
  savePreference(preference: AgentPreference) { this.preferences.set(this.session.user.id, preference); return preference; }
  recordActionFeedback(input: { action: string; outcome: "accepted" | "dismissed" | "unhelpful" | "alternative_requested"; note?: string }) {
    const current = this.getPreference();
    const accepted = input.outcome === "accepted" ? [...new Set([...current.acceptedActionTypes, input.action])] : current.acceptedActionTypes;
    const rejected = input.outcome === "dismissed" || input.outcome === "unhelpful" ? [...new Set([...current.rejectedActionTypes, input.action])] : current.rejectedActionTypes;
    const constraints = input.note && input.outcome !== "accepted" ? [...current.constraints, input.note].slice(-8) : current.constraints;
    const recentFeedback = [...current.recentFeedback, `${input.outcome}: ${input.action}${input.note ? ` (${input.note})` : ""}`].slice(-8);
    return this.savePreference({ ...current, acceptedActionTypes: accepted, rejectedActionTypes: rejected, constraints, recentFeedback });
  }

  getCommunity(templateId: string): TemplateCommunity {
    const listed = this.participants.filter((participant) => participant.templateId === templateId && participant.visibility === "listed");
    const anonymous = this.participants.filter((participant) => participant.templateId === templateId && participant.visibility === "anonymous");
    return { templateId, participantCount: listed.length + anonymous.length, previewParticipants: listed.slice(0, 3) };
  }
  listCommunityParticipants(templateId: string) { return this.participants.filter((participant) => participant.templateId === templateId && participant.visibility === "listed"); }

  startChallenge(template: ChallengeTemplate, initiatedBy?: ChallengeInitiator) {
    this.session = {
      user: { ...this.session.user, status: "challenger" },
      activeChallenge: { templateId: template.id, originTemplateId: template.id, initiatedBy, currentDay: 1, status: "active", startedAt: now() },
      activeActionCard: null,
      habitProtocol: null,
      report: null,
    };
    this.checkIns = [];
    this.joinCommunity(template.id, initiatedBy?.sourceFeedItemId);
    return this.session;
  }

  joinCommunity(templateId: string, sourceFeedItemId?: string) {
    const current = this.participants.find((participant) => participant.userId === this.session.user.id && participant.templateId === templateId);
    if (current) return current;
    const participant: TemplateParticipant = { userId: this.session.user.id, templateId, displayName: this.session.user.displayName, joinedAt: now(), visibility: this.session.user.participantVisibility, sourceFeedItemId };
    this.participants = [participant, ...this.participants];
    return participant;
  }

  saveHabitProtocol(protocol: HabitProtocol) { this.session = { ...this.session, habitProtocol: protocol }; return protocol; }

  createCheckInJob() {
    const timestamp = now();
    const job: CheckInJob = { id: crypto.randomUUID(), status: "queued", createdAt: timestamp, updatedAt: timestamp };
    this.checkInJobs.set(job.id, job);
    return job;
  }
  getCheckInJob(id: string) { return this.checkInJobs.get(id); }
  updateCheckInJob(id: string, status: CheckInJobStatus, values: Partial<Pick<CheckInJob, "checkInId" | "error" | "result">> = {}) {
    const job = this.checkInJobs.get(id);
    if (!job) return null;
    const next = { ...job, ...values, status, updatedAt: now() };
    this.checkInJobs.set(id, next);
    return next;
  }
  emitJobEvent(id: string, event: CheckInJobEvent) { this.jobListeners.get(id)?.forEach((listener) => listener(event)); }
  subscribeToJob(id: string, listener: (event: CheckInJobEvent) => void) {
    const listeners = this.jobListeners.get(id) ?? new Set<(event: CheckInJobEvent) => void>();
    listeners.add(listener); this.jobListeners.set(id, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.jobListeners.delete(id); };
  }

  addCheckIn(checkIn: CheckIn) { this.checkIns = [checkIn, ...this.checkIns]; }
  findCheckIn(id: string) { return this.checkIns.find((checkIn) => checkIn.id === id); }
  addFeedItem(item: FeedItem) { this.feed = [item, ...this.feed]; }
  setActionCard(card: ActionCard | null) { this.session = { ...this.session, activeActionCard: card }; return card; }
  completeActionCard(id: string) {
    const card = this.session.activeActionCard;
    if (!card || card.id !== id || card.status !== "active") return null;
    const next = { ...card, status: "completed" as const, completedAt: now() };
    this.setActionCard(next);
    return next;
  }
  completeChallenge(totalDays: number) {
    if (!this.session.activeChallenge) return null;
    this.session = { ...this.session, user: { ...this.session.user, status: "graduate" }, activeChallenge: { ...this.session.activeChallenge, currentDay: totalDays, status: "completed" } };
    return this.session;
  }
  saveReport(report: TransformationReport) { this.session = { ...this.session, report }; return report; }
}

export const habitRepository = new HabitRepository();
