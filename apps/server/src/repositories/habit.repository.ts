import type { ChallengeTemplate, CheckIn, FeedItem, SessionState, TransformationReport } from "@rawhabit/shared";

const templates: ChallengeTemplate[] = [
  { id: "quit-smoking-30", title: "30-Day Quit Smoking", totalDays: 30, description: "Build a smoke-free day, one honest check-in at a time.", strategyRules: ["Drink water and take a 10-minute walk after a craving.", "Text an accountability contact before buying cigarettes.", "If you slip, record it honestly and restart tomorrow without self-judgment."] },
  { id: "gym-21", title: "21-Day Gym Consistency", totalDays: 21, description: "Make movement a small, repeatable promise.", strategyRules: ["Lay out workout clothes the night before.", "Commit to just 10 minutes when motivation is low."] },
  { id: "screen-free-14", title: "14-Day Screen-Free Nights", totalDays: 14, description: "Protect your wind-down ritual from the scroll.", strategyRules: ["Charge your phone outside the bedroom.", "Replace late scrolling with one page of a book."] },
];

export class HabitRepository {
  private session: SessionState = { user: { displayName: "Maya", status: "challenger" }, activeChallenge: null, report: null };
  private checkIns: CheckIn[] = [];
  private feed: FeedItem[] = [
    { id: "seed-1", kind: "daily_log", authorName: "Alex", templateId: "gym-21", challengeTitle: "21-Day Gym Consistency", currentDay: 8, totalDays: 21, caption: "Showed up for 10 minutes. That was enough today.", coachSnippet: "Protect the next small promise.", createdAt: new Date(Date.now() - 3_600_000).toISOString() },
    { id: "seed-2", kind: "daily_log", authorName: "Jordan", templateId: "screen-free-14", challengeTitle: "14-Day Screen-Free Nights", currentDay: 5, totalDays: 14, caption: "Phone stayed outside the bedroom again.", coachSnippet: "Keep the cue visible.", createdAt: new Date(Date.now() - 7_200_000).toISOString() },
  ];

  listTemplates() { return templates; }
  findTemplate(id: string) { return templates.find((template) => template.id === id); }
  getSession() { return this.session; }
  getFeed() { return this.feed; }
  getActiveTemplate() { return this.session.activeChallenge && this.findTemplate(this.session.activeChallenge.templateId); }

  startChallenge(template: ChallengeTemplate) {
    this.session = { user: { displayName: "Maya", status: "challenger" }, activeChallenge: { templateId: template.id, currentDay: 1, status: "active", startedAt: new Date().toISOString() }, report: null };
    this.checkIns = [];
    return this.session;
  }

  addCheckIn(checkIn: CheckIn) { this.checkIns = [checkIn, ...this.checkIns]; }
  addFeedItem(item: FeedItem) { this.feed = [item, ...this.feed]; }
  completeChallenge(totalDays: number) {
    if (!this.session.activeChallenge) return null;
    this.session = { ...this.session, user: { ...this.session.user, status: "graduate" }, activeChallenge: { ...this.session.activeChallenge, currentDay: totalDays, status: "completed" } };
    return this.session;
  }
  saveReport(report: TransformationReport) { this.session = { ...this.session, report }; return report; }
}

export const habitRepository = new HabitRepository();
