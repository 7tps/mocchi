import {
  SCHEMA_VERSION,
  type AnswerCheck,
  type AnswerMeta,
  type CharacterProgress,
  type ExperienceLevel,
  type LearningProgress,
  type LearningSession,
  type PauseState,
  type PlacementResult,
  type Platform,
  type Question,
  type QuizAttempt,
  type ScheduledOpportunity,
  type SessionType,
  type SkillProfile,
  type SyncEvent,
  type SyncStatus,
  type UserProfile,
  type UserSettings,
} from '@jc/shared-types';
import { getLibrary, type ContentLibrary } from '@jc/japanese-content';
import {
  DAY,
  HOUR,
  HybridClock,
  MINUTE,
  createId,
  localDateKey,
  systemTimeZone,
} from '@jc/shared-utils';
import {
  answerPlacement as engineAnswerPlacement,
  applyReview,
  bandForAbility,
  beginnerPlacement,
  checkAnswer,
  explainWrong,
  kanjiRevealPenalty,
  composeSession,
  computeStats,
  computeStreak,
  countDue,
  dueTimes,
  emptyCharacter,
  emptyProfile,
  finishPlacement as engineFinishPlacement,
  guessRate,
  latestPlacement,
  levelProgress,
  newCandidates,
  newProgress,
  nextPlacementQuestion,
  overallAbility,
  placementProgress,
  placementSeeds,
  planMobileNotifications,
  profileFromPlacement,
  replayAttempts,
  snapshotFrom,
  startOfNextLocalDay,
  startPlacement,
  updateCharacter,
  updateSkill,
  weakestSkills,
  xpForSession,
  isPaused,
  COSMETICS,
  type PlacementState,
  type PlannedQuestion,
} from '@jc/learning-engine';
import { lineFor, moodFor } from '@jc/design-system';
import type {
  AnswerFeedback,
  AppState,
  Dashboard,
  Feedback,
  LibraryEntry,
  LibraryFilter,
  OnboardingPrefs,
  PauseKind,
  PlacementView,
  PublicQuestion,
  SchedulerSnapshot,
  SessionSummary,
  SessionView,
  SnoozeKind,
  TutorApi,
} from './api';
import type { SecretStore, TutorStore } from './store';
import { MemorySecretStore } from './store';
import { defaultSettings, sanitizeSettings } from './defaults';
import { SyncClient, SyncError, mergeSettings, syncableSettings } from './sync';

export interface TutorServiceOptions {
  store: TutorStore;
  platform: Platform;
  library?: ContentLibrary;
  now?: () => number;
  timeZone?: () => string;
  secrets?: SecretStore;
  fetch?: ConstructorParameters<typeof SyncClient>[1];
  listeningAvailable?: boolean;
}

interface ActiveSession {
  session: LearningSession;
  plan: PlannedQuestion[];
  answered: Map<string, boolean>;
}

interface PromptLog {
  date: string;
  count: number;
  lastAt: number | null;
}

const TOKEN_KEY = 'sync-token';
/** How long a check-in avoids items the learner just closed a pop-up on. */
const DISMISS_COOLDOWN_MS = 30 * MINUTE;

const REVEAL_NOTE = 'Reading shown: this counts toward kanji practice, not against this skill.';
const KANJI_NOTE = 'Noted as kanji to work on. It does not count against the skill being tested.';
const DONT_KNOW_NOTE = 'No guess needed — this one comes back soon.';

export function publicQuestion(q: Question): PublicQuestion {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { answer, accepted, explanation, example, choiceNotes, ...rest } = q;
  return rest;
}

/**
 * Platform-agnostic application service. Desktop runs it in the Electron
 * main process (renderers talk to it over IPC); mobile and the browser
 * preview run it in-process. All learning state flows through here.
 */
export class TutorService implements TutorApi {
  /** Bundled curriculum plus any installed level packs; replaced via replaceLibrary(). */
  library: ContentLibrary;
  private readonly store: TutorStore;
  private readonly platform: Platform;
  private readonly now: () => number;
  private readonly tz: () => string;
  private readonly secrets: SecretStore;
  private readonly fetchImpl?: TutorServiceOptions['fetch'];
  private listening: boolean;

  private deviceId = '';
  private clock!: HybridClock;
  private profile: UserProfile | null = null;
  private settings: UserSettings = defaultSettings();
  private character: CharacterProgress = emptyCharacter();
  private skills: SkillProfile;
  private progress = new Map<string, LearningProgress>();
  private pauseState: PauseState = { until: null, indefinite: false };
  private snoozeUntil: number | null = null;
  private placementState: PlacementState | null = null;
  private placement: PlacementResult | null = null;
  private active = new Map<string, ActiveSession>();
  private listeners = new Set<(reason: string) => void>();
  private syncing: Promise<SyncStatus> | null = null;
  private lastSyncError: string | undefined;

  constructor(opts: TutorServiceOptions) {
    this.store = opts.store;
    this.platform = opts.platform;
    this.library = opts.library ?? getLibrary();
    this.now = opts.now ?? Date.now;
    this.tz = opts.timeZone ?? systemTimeZone;
    this.secrets = opts.secrets ?? new MemorySecretStore();
    this.fetchImpl = opts.fetch ?? (typeof fetch !== 'undefined' ? (fetch as unknown as TutorServiceOptions['fetch']) : undefined);
    this.listening = !!opts.listeningAvailable;
    this.skills = emptyProfile(this.now());
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async init(): Promise<void> {
    await this.store.init();
    this.deviceId = (await this.store.getMeta<string>('deviceId')) ?? createId(this.now());
    await this.store.setMeta('deviceId', this.deviceId);
    this.clock = new HybridClock(this.deviceId.slice(-8), this.now, await this.store.getMeta<string>('hlc'));
    this.profile = (await this.store.getMeta<UserProfile>('profile')) ?? null;
    this.settings = sanitizeSettings({ ...defaultSettings(), ...((await this.store.getMeta<UserSettings>('settings')) ?? {}) });
    this.character = (await this.store.getMeta<CharacterProgress>('character')) ?? emptyCharacter();
    this.pauseState = (await this.store.getMeta<PauseState>('pause')) ?? { until: null, indefinite: false };
    this.snoozeUntil = (await this.store.getMeta<number | null>('snoozeUntil')) ?? null;
    this.placementState = (await this.store.getMeta<PlacementState>('placementInProgress')) ?? null;
    const placements = await this.store.getPlacements();
    this.placement = latestPlacement(placements) ?? null;
    this.progress = new Map((await this.store.getAllProgress()).map((p) => [p.itemId, p]));
    const storedSkills = await this.store.getMeta<SkillProfile>('skills');
    this.skills = storedSkills ? { ...emptyProfile(this.now()), ...storedSkills } : this.placement ? profileFromPlacement(this.placement, this.now()) : emptyProfile(this.now());
    if (!this.settings.enabledSkills.includes('listening') && this.listening && !this.settings.updatedAt.enabledSkills) {
      this.settings.enabledSkills = [...this.settings.enabledSkills, 'listening'];
    }
    // Keep the profile's timezone current; schedules are absolute instants so travel never breaks them.
    if (this.profile && this.profile.timezone !== this.tz()) {
      this.profile = { ...this.profile, timezone: this.tz() };
      await this.store.setMeta('profile', this.profile);
    }
  }

  /** Desktop/web report text-to-speech availability after start-up. */
  setListeningAvailable(available: boolean): void {
    if (this.listening === available) return;
    this.listening = available;
    this.emit('capabilities');
  }

  /**
   * Swap in a new library (level packs added or removed). Progress is keyed by
   * item id, so nothing is lost; items no longer in the library are simply not
   * scheduled. Sessions already in progress keep their questions.
   */
  replaceLibrary(library: ContentLibrary): void {
    this.library = library;
    this.emit('library');
  }

  subscribe(fn: (reason: string) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(reason: string): void {
    for (const fn of this.listeners) {
      try {
        fn(reason);
      } catch {
        // A failing listener must not break the service.
      }
    }
  }

  private stamp(): string {
    const s = this.clock.now();
    void this.store.setMeta('hlc', s);
    return s;
  }

  private today(): string {
    return localDateKey(this.now(), this.tz());
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  async getAppState(): Promise<AppState> {
    return {
      onboarded: !!this.profile?.onboardedAt,
      hasPlacement: !!this.placement,
      profile: this.profile,
      settings: this.settings,
      character: this.character,
      level: levelProgress(this.character.xp),
      pause: this.effectivePause(),
      snoozeUntil: this.snoozeUntil && this.snoozeUntil > this.now() ? this.snoozeUntil : null,
      placement: this.placement,
      placementInProgress: !!this.placementState && !this.placementState.finished,
      timeZone: this.tz(),
      deviceId: this.deviceId,
      platform: this.platform,
      listeningAvailable: this.listening,
    };
  }

  private effectivePause(): PauseState {
    return isPaused(this.pauseState, this.now()) ? this.pauseState : { until: null, indefinite: false };
  }

  async getDashboard(): Promise<Dashboard> {
    const [attempts, sessions] = await Promise.all([this.store.getAttempts({ since: this.now() - 60 * DAY }), this.store.getSessions()]);
    const stats = computeStats({ library: this.library, progress: [...this.progress.values()], attempts, sessions, skills: this.skills, now: this.now(), timeZone: this.tz() });
    const allAttempts = attempts.length;
    stats.questionsAnswered = Math.max(allAttempts, (await this.store.getAttempts()).length);
    const recent = [...this.progress.values()]
      .filter((p) => p.status !== 'new')
      .sort((a, b) => b.firstSeenAt - a.firstSeenAt)
      .slice(0, 8)
      .map((p) => {
        const item = this.library.byId.get(p.itemId);
        return item ? { id: item.id, ja: item.ja, reading: item.reading, meaning: item.meanings[0] ?? '', status: p.status, type: item.type } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    const overall = overallAbility(this.skills);
    const next = this.platform === 'mobile' ? (await this.planNotifications())[0] : undefined;
    return {
      stats,
      overallAbility: Math.round(overall * 10) / 10,
      band: bandForAbility(overall),
      recent,
      weakest: weakestSkills(this.skills, this.settings.enabledSkills, 3),
      character: this.character,
      level: levelProgress(this.character.xp),
      nextReminder: next ? new Date(next.at).toISOString() : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Onboarding & placement
  // -------------------------------------------------------------------------

  private placementView(): PlacementView {
    const s = this.placementState;
    if (!s) return { finished: true, question: null, answered: 0, estimatedTotal: 0 };
    const { answered, estimatedTotal } = placementProgress(s);
    return {
      finished: s.finished,
      question: s.current ? { ...publicQuestion(s.current), placementSkill: s.current.placementSkill } : null,
      answered,
      estimatedTotal,
    };
  }

  async beginPlacement(experience: ExperienceLevel): Promise<PlacementView> {
    let state = startPlacement(experience, this.now(), `${this.deviceId}:${this.now()}`);
    state = nextPlacementQuestion(state, this.library, this.listening);
    this.placementState = state;
    await this.store.setMeta('placementInProgress', state);
    await this.ensureProfile(experience);
    this.emit('placement-start');
    return this.placementView();
  }

  async resumePlacement(): Promise<PlacementView | null> {
    if (!this.placementState || this.placementState.finished) return null;
    if (!this.placementState.current) {
      this.placementState = nextPlacementQuestion(this.placementState, this.library, this.listening);
    }
    return this.placementView();
  }

  async answerPlacement(response: string | string[] | null, latencyMs?: number, meta: AnswerMeta = {}): Promise<Feedback> {
    const s = this.placementState;
    if (!s?.current) throw new Error('No placement question is active.');
    const q = s.current;
    const { state, correct } = engineAnswerPlacement(s, response, latencyMs, meta);
    this.placementState = state;
    await this.store.setMeta('placementInProgress', state);
    const whyWrong = response !== null && !meta.cantReadKanji ? explainWrong(q, response, checkAnswer(q, response)) : undefined;
    return {
      correct,
      answer: q.answer,
      accepted: q.accepted,
      explanation: q.explanation,
      example: q.example,
      whyWrong,
      skipped: meta.cantReadKanji || undefined,
      dontKnow: (response === null && !meta.cantReadKanji) || undefined,
      note: meta.cantReadKanji ? KANJI_NOTE : meta.readingShown && q.kanjiDifficulty !== undefined ? REVEAL_NOTE : undefined,
      mood: correct ? 'happy' : 'encouraging',
    };
  }

  async nextPlacement(): Promise<PlacementView> {
    if (!this.placementState) throw new Error('Placement has not started.');
    this.placementState = nextPlacementQuestion(this.placementState, this.library, this.listening);
    await this.store.setMeta('placementInProgress', this.placementState);
    return this.placementView();
  }

  async finishPlacement(): Promise<PlacementResult> {
    if (!this.placementState) throw new Error('Placement has not started.');
    const result = { ...engineFinishPlacement(this.placementState, this.library, this.now()), hlc: this.stamp() };
    await this.applyPlacement(result);
    this.placementState = null;
    await this.store.deleteMeta('placementInProgress');
    return result;
  }

  async startAsBeginner(): Promise<PlacementResult> {
    const result = { ...beginnerPlacement(this.now()), hlc: this.stamp() };
    await this.ensureProfile('none');
    await this.applyPlacement(result);
    this.placementState = null;
    await this.store.deleteMeta('placementInProgress');
    return result;
  }

  private async applyPlacement(result: PlacementResult): Promise<void> {
    await this.store.addPlacement(result);
    this.placement = result;
    this.skills = profileFromPlacement(result, this.now());
    await this.store.setMeta('skills', this.skills);
    // Items demonstrated in the exam start in review instead of being re-taught.
    const seeds = [...placementSeeds(result).values()].filter((p) => !this.progress.has(p.itemId) && this.library.byId.has(p.itemId));
    for (const p of seeds) this.progress.set(p.itemId, p);
    await this.store.putProgress(seeds);
    this.emit('placement');
  }

  private async ensureProfile(experience: ExperienceLevel): Promise<void> {
    if (!this.profile) {
      this.profile = { id: createId(this.now()), createdAt: this.now(), timezone: this.tz(), experience };
    } else {
      this.profile = { ...this.profile, experience };
    }
    await this.store.setMeta('profile', this.profile);
    await this.store.setMeta('profileDirty', true);
  }

  async completeOnboarding(prefs: OnboardingPrefs): Promise<AppState> {
    await this.ensureProfile(prefs.experience ?? this.profile?.experience ?? 'none');
    if (!this.placement) await this.startAsBeginner();
    this.profile = { ...(this.profile as UserProfile), displayName: prefs.displayName ?? this.profile?.displayName, onboardedAt: this.now() };
    await this.store.setMeta('profile', this.profile);
    if (prefs.settings) await this.updateSettings(prefs.settings);
    this.emit('onboarded');
    return this.getAppState();
  }

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------

  /**
   * Items left unanswered when a pop-up was closed, with when. Each expires on
   * its own (an older format kept one shared timestamp that every new dismissal
   * refreshed, so items could stay blocked indefinitely).
   */
  private async dismissedAt(): Promise<Record<string, number>> {
    const rec = await this.store.getMeta<{ items?: Record<string, number>; ids?: string[]; at?: number }>('recentDismissed');
    const items: Record<string, number> = { ...rec?.items };
    for (const id of rec?.ids ?? []) items[id] ??= rec?.at ?? 0;
    const cutoff = this.now() - DISMISS_COOLDOWN_MS;
    for (const [id, at] of Object.entries(items)) if (at < cutoff) delete items[id];
    return items;
  }

  private async recentlyDismissed(): Promise<Set<string>> {
    return new Set(Object.keys(await this.dismissedAt()));
  }

  async startSession(type: SessionType, opts: { reviewOnly?: boolean; length?: number } = {}): Promise<SessionView | null> {
    const now = this.now();
    const plan = composeSession({
      library: this.library,
      progress: this.progress,
      skills: this.skills,
      enabledSkills: this.settings.enabledSkills.length ? this.settings.enabledSkills : ['hiragana'],
      sessionLength: opts.length ?? this.settings.sessionLength,
      newItemsPerSession: this.settings.newItemsPerSession,
      now,
      seed: `${this.deviceId}:${now}`,
      // Only check-ins avoid just-dismissed items; a session the learner starts
      // (clicking Mocchi, "Review only") should include everything that is due.
      recentItemIds: type === 'scheduled' || type === 'notification' ? await this.recentlyDismissed() : undefined,
      listening: this.listening && this.settings.enabledSkills.includes('listening'),
      reviewOnly: opts.reviewOnly,
    });
    if (!plan.length) return null;
    const session: LearningSession = {
      id: createId(now),
      platform: this.platform,
      type,
      startedAt: now,
      questionCount: 0,
      correctCount: 0,
      localDate: this.today(),
      xpAwarded: 0,
      deviceId: this.deviceId,
      hlc: this.stamp(),
    };
    await this.store.putSession(session);
    this.active.set(session.id, { session, plan, answered: new Map() });
    return {
      id: session.id,
      type,
      questions: plan.map((p) => ({ ...publicQuestion(p.question), kind: p.kind })),
    };
  }

  async answerQuestion(sessionId: string, questionId: string, response: string | string[], latencyMs?: number, meta: AnswerMeta = {}): Promise<AnswerFeedback> {
    const active = this.active.get(sessionId);
    if (!active) throw new Error('This session has ended.');
    const planned = active.plan.find((p) => p.question.id === questionId);
    if (!planned) throw new Error('Unknown question.');
    const q = planned.question;
    // "I don't know" is a miss without a guess: same skill/SRS update as a wrong answer.
    const dontKnow = !!meta.dontKnow;
    const check: AnswerCheck = dontKnow ? { correct: false, normalizedResponse: '' } : checkAnswer(q, response);
    const now = this.now();
    const revealed = !!meta.readingShown && q.kanjiDifficulty !== undefined && q.skill !== 'kanji';
    if (!active.answered.has(questionId)) {
      active.answered.set(questionId, check.correct);
      const item = this.library.byId.get(q.itemId);
      const est = this.skills[q.skill];
      const attempt: QuizAttempt = {
        id: createId(now),
        sessionId,
        itemId: q.itemId,
        format: q.format,
        mode: q.mode,
        skill: q.skill,
        difficulty: q.difficulty,
        response: dontKnow ? '' : Array.isArray(response) ? response.join(' ') : response.slice(0, 200),
        correct: check.correct,
        dontKnow: dontKnow || undefined,
        latencyMs: latencyMs !== undefined ? Math.round(Math.min(latencyMs, 600_000)) : undefined,
        readingShown: revealed || undefined,
        kanjiDifficulty: revealed ? q.kanjiDifficulty : undefined,
        answeredAt: now,
        deviceId: this.deviceId,
        hlc: this.stamp(),
      };
      await this.store.addAttempt(attempt);
      const prev = this.progress.get(q.itemId) ?? newProgress(q.itemId, now);
      const next = applyReview(prev, { correct: check.correct, now, latencyMs, mode: q.mode, relativeDifficulty: item ? item.difficulty - est.ability : 0 });
      this.progress.set(q.itemId, next);
      await this.store.putProgress([next]);
      this.skills = { ...this.skills, [q.skill]: updateSkill(est, q.difficulty, check.correct, q.mode === 'choice' ? guessRate(q.choices?.length) : 0, now) };
      // Needing the reading is evidence about kanji, not about the skill being tested.
      if (revealed) this.skills = { ...this.skills, kanji: kanjiRevealPenalty(this.skills.kanji, q.kanjiDifficulty as number, now) };
      await this.store.setMeta('skills', this.skills);
      active.session = { ...active.session, questionCount: active.session.questionCount + 1, correctCount: active.session.correctCount + (check.correct ? 1 : 0) };
      await this.store.putSession(active.session);
    }
    const p = this.progress.get(q.itemId);
    const line = lineFor(check.correct ? 'correct' : 'incorrect', now);
    return {
      correct: check.correct,
      note: dontKnow ? DONT_KNOW_NOTE : [check.note ?? (check.correct ? line.ja : undefined), revealed ? REVEAL_NOTE : undefined].filter(Boolean).join(' ') || undefined,
      answer: q.answer,
      accepted: q.accepted,
      explanation: q.explanation,
      example: q.example,
      dontKnow: dontKnow || undefined,
      whyWrong: dontKnow ? undefined : explainWrong(q, response, check),
      mood: dontKnow ? 'encouraging' : moodFor(check.correct ? 'correct' : 'incorrect'),
      status: p?.status ?? 'learning',
      nextReviewAt: p?.nextReviewAt ?? now,
      reason: planned.reason,
    };
  }

  /**
   * Questions answered on a local date. With `promptedOnly`, only sessions the
   * app offered (scheduled pop-ups, reminders) count: extra sessions started by
   * clicking Mocchi never use up the day's check-ins.
   */
  private async questionsOn(date: string, promptedOnly = false): Promise<number> {
    const since = this.now() - 2 * DAY;
    const attempts = await this.store.getAttempts({ since });
    let prompted: Set<string> | null = null;
    if (promptedOnly) {
      const sessions = await this.store.getSessions({ since: since - DAY });
      prompted = new Set(sessions.filter((s) => s.type === 'scheduled' || s.type === 'notification').map((s) => s.id));
    }
    return attempts.filter((a) => localDateKey(a.answeredAt, this.tz()) === date && (!prompted || prompted.has(a.sessionId))).length;
  }

  async finishSession(sessionId: string): Promise<SessionSummary> {
    const active = this.active.get(sessionId);
    if (!active) throw new Error('This session has ended.');
    this.active.delete(sessionId);
    const now = this.now();
    const today = this.today();
    const sessions = await this.store.getSessions({ since: now - 400 * DAY });
    const completedToday = sessions.filter((s) => s.completedAt && s.localDate === today && s.id !== sessionId);
    const questionsToday = await this.questionsOn(today);
    const before = questionsToday - active.session.questionCount;
    const goal = this.settings.dailyGoalQuestions;
    const goalJustReached = goal > 0 && before < goal && questionsToday >= goal;
    const studyDays = new Set(sessions.filter((s) => s.completedAt).map((s) => s.localDate));
    if (active.session.questionCount > 0) studyDays.add(today);
    const streakDays = computeStreak(studyDays, today);
    const xp = xpForSession({
      correct: active.session.correctCount,
      answered: active.session.questionCount,
      firstSessionToday: completedToday.length === 0,
      xpEarnedToday: completedToday.reduce((a, s) => a + s.xpAwarded, 0),
      streakDays,
      goalJustReached,
    });
    const session: LearningSession = { ...active.session, completedAt: now, xpAwarded: xp };
    await this.store.putSession(session);
    const all = sessions.filter((s) => s.id !== sessionId).concat(session);
    const update = updateCharacter(this.character, snapshotFrom(all, this.progress.values(), today, goal));
    this.character = update.character;
    await this.store.setMeta('character', this.character);
    this.emit('session');
    return {
      id: sessionId,
      answered: session.questionCount,
      correct: session.correctCount,
      xp,
      level: levelProgress(this.character.xp),
      leveledUp: update.leveledUp,
      newUnlocks: update.newUnlocks,
      newMilestones: update.newMilestones,
      streakDays,
      goalReached: goal > 0 && questionsToday >= goal,
      questionsToday,
      dailyGoal: goal,
      mood: goalJustReached || update.leveledUp ? 'celebrating' : moodFor('session-complete'),
    };
  }

  async dismissSession(sessionId: string): Promise<void> {
    const active = this.active.get(sessionId);
    if (!active) return;
    this.active.delete(sessionId);
    const unanswered = active.plan.filter((p) => !active.answered.has(p.question.id)).map((p) => p.question.itemId);
    const items = await this.dismissedAt();
    for (const id of unanswered) items[id] = this.now();
    await this.store.setMeta('recentDismissed', { items });
    if (active.answered.size > 0) {
      await this.finishSessionQuietly(active);
    }
    this.emit('dismissed');
  }

  private async finishSessionQuietly(active: ActiveSession): Promise<void> {
    this.active.set(active.session.id, active);
    await this.finishSession(active.session.id);
  }

  // -------------------------------------------------------------------------
  // Settings, pause, snooze
  // -------------------------------------------------------------------------

  async updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    const next: UserSettings = { ...this.settings, updatedAt: { ...this.settings.updatedAt } };
    for (const [key, value] of Object.entries(patch) as Array<[keyof UserSettings, unknown]>) {
      if (key === 'updatedAt') continue;
      if (JSON.stringify(next[key]) === JSON.stringify(value)) continue;
      (next as unknown as Record<string, unknown>)[key] = value;
      next.updatedAt[key] = this.stamp();
    }
    this.settings = sanitizeSettings(next);
    await this.store.setMeta('settings', this.settings);
    await this.store.setMeta('settingsDirty', true);
    this.emit('settings');
    return this.settings;
  }

  async pause(kind: PauseKind): Promise<PauseState> {
    const now = this.now();
    this.pauseState =
      kind === 'indefinite' ? { until: null, indefinite: true } : { until: kind === '1h' ? now + HOUR : startOfNextLocalDay(now, this.tz()), indefinite: false };
    await this.store.setMeta('pause', this.pauseState);
    this.emit('pause');
    return this.pauseState;
  }

  async resume(): Promise<PauseState> {
    this.pauseState = { until: null, indefinite: false };
    this.snoozeUntil = null;
    await this.store.setMeta('pause', this.pauseState);
    await this.store.setMeta('snoozeUntil', null);
    this.emit('pause');
    return this.pauseState;
  }

  async snooze(kind: SnoozeKind): Promise<number> {
    const now = this.now();
    this.snoozeUntil = kind === '15m' ? now + 15 * MINUTE : kind === '1h' ? now + HOUR : startOfNextLocalDay(now, this.tz());
    await this.store.setMeta('snoozeUntil', this.snoozeUntil);
    this.emit('snooze');
    return this.snoozeUntil;
  }

  // -------------------------------------------------------------------------
  // Scheduling support
  // -------------------------------------------------------------------------

  async getSchedulerSnapshot(): Promise<SchedulerSnapshot> {
    const now = this.now();
    const log = await this.promptLog();
    return {
      settings: this.settings,
      pause: this.effectivePause(),
      snoozeUntil: this.snoozeUntil && this.snoozeUntil > now ? this.snoozeUntil : null,
      timeZone: this.tz(),
      dueCount: countDue(this.progress, now),
      newAvailable: this.hasNewMaterial(),
      questionsToday: await this.questionsOn(this.today()),
      promptedQuestionsToday: await this.questionsOn(this.today(), true),
      promptsToday: log.count,
      lastPromptAt: log.lastAt,
      onboarded: !!this.profile?.onboardedAt,
    };
  }

  private hasNewMaterial(): boolean {
    return newCandidates(
      {
        library: this.library,
        progress: this.progress,
        skills: this.skills,
        enabledSkills: this.settings.enabledSkills,
        sessionLength: 1,
        newItemsPerSession: 1,
        now: this.now(),
        seed: 0,
      },
      () => 0.5,
    ).length > 0 && this.settings.newItemsPerSession > 0;
  }

  private async promptLog(): Promise<PromptLog> {
    const log = (await this.store.getMeta<PromptLog>('promptLog')) ?? { date: this.today(), count: 0, lastAt: null };
    return log.date === this.today() ? log : { date: this.today(), count: 0, lastAt: log.lastAt };
  }

  async recordPrompt(): Promise<void> {
    const log = await this.promptLog();
    await this.store.setMeta('promptLog', { date: this.today(), count: log.count + 1, lastAt: this.now() });
  }

  async planNotifications(): Promise<ScheduledOpportunity[]> {
    const today = this.today();
    const sessions = await this.store.getSessions({ since: this.now() - 60 * DAY });
    const studyDays = sessions.filter((s) => s.completedAt).map((s) => s.localDate);
    return planMobileNotifications({
      now: this.now(),
      timeZone: this.tz(),
      settings: this.settings,
      pause: this.effectivePause(),
      dueTimes: dueTimes(this.progress.values()),
      newAvailable: this.hasNewMaterial(),
      studiedToday: studyDays.includes(today),
      questionsToday: await this.questionsOn(today, true),
      streakDays: computeStreak(studyDays, today),
    });
  }

  // -------------------------------------------------------------------------
  // Library, review queue, character
  // -------------------------------------------------------------------------

  async getLibrary(filter: LibraryFilter): Promise<LibraryEntry[]> {
    const attempts = await this.store.getAttempts();
    const acc = new Map<string, { n: number; c: number }>();
    for (const a of attempts) {
      const e = acc.get(a.itemId) ?? { n: 0, c: 0 };
      e.n++;
      if (a.correct) e.c++;
      acc.set(a.itemId, e);
    }
    const search = filter.search?.trim().toLowerCase();
    const out: LibraryEntry[] = [];
    for (const item of this.library.items) {
      if (filter.type && filter.type !== 'all' && item.type !== filter.type) continue;
      const p = this.progress.get(item.id);
      const status = p?.status ?? 'new';
      if (filter.status === 'introduced' && status === 'new') continue;
      if (filter.status === 'new' && status !== 'new') continue;
      if (filter.status === 'learning' && status !== 'learning' && status !== 'relearning') continue;
      if (filter.status === 'retained' && status !== 'retained') continue;
      if (search && ![item.ja, item.reading, item.romaji ?? '', ...item.meanings].some((s) => s.toLowerCase().includes(search))) continue;
      const a = acc.get(item.id);
      out.push({
        id: item.id,
        type: item.type,
        ja: item.ja,
        reading: item.reading,
        meaning: item.meanings.slice(0, 3).join(', '),
        jlpt: item.jlpt,
        status,
        nextReviewAt: p?.nextReviewAt,
        attempts: a?.n ?? 0,
        accuracy: a ? a.c / a.n : null,
        examples: item.examples,
        notes: item.notes,
      });
      if (filter.limit && out.length >= filter.limit) break;
    }
    return out;
  }

  async getReviewQueue(): Promise<LibraryEntry[]> {
    const now = this.now();
    const soon = [...this.progress.values()].filter((p) => p.status !== 'new' && p.nextReviewAt <= now + DAY).sort((a, b) => a.nextReviewAt - b.nextReviewAt);
    const entries = await this.getLibrary({ type: 'all', status: 'introduced' });
    const byId = new Map(entries.map((e) => [e.id, e]));
    return soon.map((p) => byId.get(p.itemId)).filter((e): e is LibraryEntry => !!e);
  }

  async selectCosmetic(id: string | null): Promise<CharacterProgress> {
    if (id !== null && (!this.character.unlocked.includes(id) || !COSMETICS.some((c) => c.id === id))) {
      throw new Error('That cosmetic is not unlocked yet.');
    }
    this.character = { ...this.character, selectedCosmetic: id };
    await this.store.setMeta('character', this.character);
    this.emit('character');
    return this.character;
  }

  // -------------------------------------------------------------------------
  // Data management
  // -------------------------------------------------------------------------

  async exportData(): Promise<string> {
    const [attempts, sessions, placements] = await Promise.all([this.store.getAttempts(), this.store.getSessions(), this.store.getPlacements()]);
    return JSON.stringify(
      {
        format: 'jc-export',
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date(this.now()).toISOString(),
        profile: this.profile,
        settings: this.settings,
        character: this.character,
        skills: this.skills,
        placements,
        sessions,
        attempts,
        progress: [...this.progress.values()],
      },
      null,
      2,
    );
  }

  async clearAllData(): Promise<void> {
    await this.store.clearAll();
    await this.secrets.delete(TOKEN_KEY);
    this.active.clear();
    this.progress.clear();
    this.profile = null;
    this.placement = null;
    this.placementState = null;
    this.settings = defaultSettings();
    this.character = emptyCharacter();
    this.skills = emptyProfile(this.now());
    this.pauseState = { until: null, indefinite: false };
    this.snoozeUntil = null;
    this.deviceId = createId(this.now());
    await this.store.setMeta('deviceId', this.deviceId);
    this.clock = new HybridClock(this.deviceId.slice(-8), this.now);
    this.emit('cleared');
  }

  // -------------------------------------------------------------------------
  // Sync
  // -------------------------------------------------------------------------

  private async client(): Promise<SyncClient> {
    if (!this.fetchImpl) throw new SyncError('Networking is not available on this platform.');
    return new SyncClient(this.settings.syncServerUrl, this.fetchImpl, await this.secrets.get(TOKEN_KEY));
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const u = await this.store.getUnsynced();
    return {
      enabled: this.settings.syncEnabled,
      linked: !!(await this.secrets.get(TOKEN_KEY)),
      lastSyncAt: await this.store.getMeta<number>('lastSyncAt'),
      pending: u.attempts.length + u.sessions.length + u.placements.length,
      lastError: this.lastSyncError,
    };
  }

  async createAccount(): Promise<SyncStatus> {
    const c = await this.client();
    const res = await c.createAccount(this.deviceId, this.platform);
    await this.secrets.set(TOKEN_KEY, res.token);
    await this.store.setMeta('syncUserId', res.userId);
    // Local-only progress is preserved: everything unsynced is uploaded next.
    await this.store.setMeta('settingsDirty', true);
    await this.store.setMeta('profileDirty', true);
    await this.updateSettings({ syncEnabled: true });
    return this.syncNow();
  }

  async getLinkCode(): Promise<{ code: string; expiresAt: number }> {
    return (await this.client()).linkCode();
  }

  async linkWithCode(code: string): Promise<SyncStatus> {
    const c = await this.client();
    const res = await c.link(code, this.deviceId, this.platform);
    await this.secrets.set(TOKEN_KEY, res.token);
    await this.store.setMeta('syncUserId', res.userId);
    await this.store.setMeta('syncCursor', 0);
    await this.updateSettings({ syncEnabled: true });
    return this.syncNow();
  }

  async unlinkAccount(): Promise<SyncStatus> {
    await this.secrets.delete(TOKEN_KEY);
    await this.store.deleteMeta('syncCursor');
    await this.updateSettings({ syncEnabled: false });
    return this.getSyncStatus();
  }

  async deleteAccount(): Promise<SyncStatus> {
    const c = await this.client();
    await c.deleteAccount();
    return this.unlinkAccount();
  }

  async syncNow(): Promise<SyncStatus> {
    if (!this.syncing) {
      this.syncing = this.doSync().finally(() => {
        this.syncing = null;
      });
    }
    return this.syncing;
  }

  private async doSync(): Promise<SyncStatus> {
    if (!this.settings.syncEnabled || !(await this.secrets.get(TOKEN_KEY))) return this.getSyncStatus();
    try {
      const c = await this.client();
      let cursor = (await this.store.getMeta<number>('syncCursor')) ?? 0;
      const u = await this.store.getUnsynced();
      const events: SyncEvent[] = [
        // Typed responses stay on the device; replay only needs correctness.
        ...u.attempts.map((a): SyncEvent => ({ type: 'attempt', id: a.id, hlc: a.hlc, payload: { ...a, response: '' } })),
        ...u.sessions.map((s): SyncEvent => ({ type: 'session', id: s.id, hlc: s.hlc, payload: s })),
        ...u.placements.map((p): SyncEvent => ({ type: 'placement', id: p.id, hlc: p.hlc, payload: p })),
      ];
      const settingsDirty = await this.store.getMeta<boolean>('settingsDirty');
      if (settingsDirty) events.push({ type: 'settings', id: `settings:${this.stamp()}`, hlc: this.clock.current(), payload: syncableSettings(this.settings) });
      if (this.profile && (await this.store.getMeta<boolean>('profileDirty'))) {
        events.push({ type: 'profile', id: `profile:${this.stamp()}`, hlc: this.clock.current(), payload: this.profile });
      }
      let needsReplay = false;
      let more = true;
      let first = true;
      while (more) {
        const res = await c.sync({ schemaVersion: SCHEMA_VERSION, deviceId: this.deviceId, cursor, events: first ? events : [] });
        if (first) {
          const ok = new Set(res.accepted);
          await this.store.markSynced({
            attempts: u.attempts.filter((a) => ok.has(a.id)).map((a) => a.id),
            sessions: u.sessions.filter((s) => ok.has(s.id)).map((s) => s.id),
            placements: u.placements.filter((p) => ok.has(p.id)).map((p) => p.id),
          });
          if (settingsDirty && events.some((e) => e.type === 'settings' && ok.has(e.id))) await this.store.setMeta('settingsDirty', false);
          if (events.some((e) => e.type === 'profile' && ok.has(e.id))) await this.store.setMeta('profileDirty', false);
        }
        first = false;
        needsReplay = (await this.applyRemote(res.events)) || needsReplay;
        cursor = res.cursor;
        more = res.more;
        await this.store.setMeta('syncCursor', cursor);
      }
      if (needsReplay) await this.rebuildDerivedState();
      await this.store.setMeta('lastSyncAt', this.now());
      this.lastSyncError = undefined;
      this.emit('sync');
    } catch (err) {
      this.lastSyncError = err instanceof Error ? err.message : 'Sync failed';
    }
    return this.getSyncStatus();
  }

  /** Apply events from other devices. Returns true if learning history changed. */
  private async applyRemote(events: SyncEvent[]): Promise<boolean> {
    let changed = false;
    for (const e of events) {
      this.clock.receive(e.hlc);
      switch (e.type) {
        case 'attempt':
          if (await this.store.addAttempt(e.payload, true)) changed = true;
          break;
        case 'session':
          await this.store.putSession(e.payload, true);
          changed = true;
          break;
        case 'placement':
          if (await this.store.addPlacement(e.payload, true)) changed = true;
          break;
        case 'settings': {
          const { merged, changed: c } = mergeSettings(this.settings, e.payload);
          if (c) {
            this.settings = sanitizeSettings(merged);
            await this.store.setMeta('settings', this.settings);
          }
          break;
        }
        case 'profile':
          if (!this.profile || !this.profile.onboardedAt || (e.payload.onboardedAt && e.payload.createdAt < this.profile.createdAt)) {
            this.profile = { ...e.payload, timezone: this.tz() };
            await this.store.setMeta('profile', this.profile);
          }
          break;
      }
    }
    await this.store.setMeta('hlc', this.clock.current());
    return changed;
  }

  /** Recompute progress, skills and character from the merged event log. */
  async rebuildDerivedState(): Promise<void> {
    const [attempts, placements, sessions] = await Promise.all([this.store.getAttempts(), this.store.getPlacements(), this.store.getSessions()]);
    const derived = replayAttempts(attempts, placements, this.library, this.now());
    this.progress = derived.progress;
    this.skills = derived.skills;
    this.placement = latestPlacement(placements) ?? null;
    await this.store.replaceAllProgress([...this.progress.values()]);
    await this.store.setMeta('skills', this.skills);
    const update = updateCharacter(this.character, snapshotFrom(sessions, this.progress.values(), this.today(), this.settings.dailyGoalQuestions));
    this.character = update.character;
    await this.store.setMeta('character', this.character);
    this.emit('rebuilt');
  }
}
