import type {
  AnswerMeta,
  CharacterMood,
  CharacterProgress,
  ExampleSentence,
  ExperienceLevel,
  JlptBand,
  LearningStatus,
  PauseState,
  PlacementResult,
  Platform,
  Question,
  ScheduledOpportunity,
  SessionType,
  Skill,
  SyncStatus,
  UserProfile,
  UserSettings,
} from '@jc/shared-types';
import type { DashboardStats, Habit } from '@jc/learning-engine';

/** Question as sent to the UI: answers stay in the service until submitted. */
export type PublicQuestion = Omit<Question, 'answer' | 'accepted' | 'explanation' | 'example' | 'choiceNotes'>;

export interface LevelInfo {
  level: number;
  into: number;
  needed: number;
}

export interface AppState {
  onboarded: boolean;
  hasPlacement: boolean;
  profile: UserProfile | null;
  settings: UserSettings;
  character: CharacterProgress;
  /** How regularly sessions are completed; sets Mocchi's resting mood. */
  habit: Habit;
  level: LevelInfo;
  pause: PauseState;
  snoozeUntil: number | null;
  placement: PlacementResult | null;
  placementInProgress: boolean;
  timeZone: string;
  deviceId: string;
  platform: Platform;
  listeningAvailable: boolean;
}

export interface PlacementView {
  finished: boolean;
  question: (PublicQuestion & { placementSkill: Skill }) | null;
  answered: number;
  estimatedTotal: number;
}

export interface Feedback {
  correct: boolean;
  note?: string;
  answer: string;
  accepted: string[];
  explanation: string;
  /** Skipped because the kanji couldn't be read (placement): not a wrong answer. */
  skipped?: boolean;
  /** The learner said they didn't know: shown as the answer, not a mistake. */
  dontKnow?: boolean;
  /** Why the learner's own answer is wrong (absent when correct). */
  whyWrong?: string;
  example?: ExampleSentence;
  mood: CharacterMood;
}

export interface SessionView {
  id: string;
  type: SessionType;
  questions: Array<PublicQuestion & { kind: string }>;
}

export interface AnswerFeedback extends Feedback {
  status: LearningStatus;
  nextReviewAt: number;
  reason?: string;
}

export interface SessionSummary {
  id: string;
  answered: number;
  correct: number;
  xp: number;
  level: LevelInfo;
  leveledUp: boolean;
  newUnlocks: string[];
  newMilestones: string[];
  streakDays: number;
  goalReached: boolean;
  questionsToday: number;
  dailyGoal: number;
  mood: CharacterMood;
}

export interface Dashboard {
  stats: DashboardStats;
  overallAbility: number;
  band: JlptBand | 'pre-N5';
  recent: Array<{ id: string; ja: string; reading: string; meaning: string; status: LearningStatus; type: string }>;
  weakest: Skill[];
  character: CharacterProgress;
  level: LevelInfo;
  nextReminder?: string;
}

export interface LibraryEntry {
  id: string;
  type: string;
  ja: string;
  reading: string;
  meaning: string;
  jlpt?: string;
  status: LearningStatus;
  nextReviewAt?: number;
  attempts: number;
  accuracy: number | null;
  examples: ExampleSentence[];
  notes?: string;
}

export interface LibraryFilter {
  type?: 'vocab' | 'kanji' | 'grammar' | 'kana' | 'expression' | 'particle' | 'all';
  status?: 'all' | 'introduced' | 'learning' | 'retained' | 'new';
  search?: string;
  limit?: number;
}

export interface SchedulerSnapshot {
  settings: UserSettings;
  pause: PauseState;
  snoozeUntil: number | null;
  timeZone: string;
  dueCount: number;
  newAvailable: boolean;
  questionsToday: number;
  /** Questions from sessions the app offered; learner-started sessions don't count. */
  promptedQuestionsToday: number;
  promptsToday: number;
  lastPromptAt: number | null;
  onboarded: boolean;
}

export type PauseKind = '1h' | 'tomorrow' | 'indefinite';
export type SnoozeKind = '15m' | '1h' | 'rest-of-day';

export interface OnboardingPrefs {
  experience?: ExperienceLevel;
  displayName?: string;
  settings?: Partial<UserSettings>;
}

/** The full service surface, mirrored over IPC on desktop. */
export interface TutorApi {
  getAppState(): Promise<AppState>;
  getDashboard(): Promise<Dashboard>;
  beginPlacement(experience: ExperienceLevel): Promise<PlacementView>;
  resumePlacement(): Promise<PlacementView | null>;
  answerPlacement(response: string | string[] | null, latencyMs?: number, meta?: AnswerMeta): Promise<Feedback>;
  nextPlacement(): Promise<PlacementView>;
  finishPlacement(): Promise<PlacementResult>;
  startAsBeginner(): Promise<PlacementResult>;
  completeOnboarding(prefs: OnboardingPrefs): Promise<AppState>;
  startSession(type: SessionType, opts?: { reviewOnly?: boolean; length?: number }): Promise<SessionView | null>;
  answerQuestion(sessionId: string, questionId: string, response: string | string[], latencyMs?: number, meta?: AnswerMeta): Promise<AnswerFeedback>;
  finishSession(sessionId: string): Promise<SessionSummary>;
  dismissSession(sessionId: string): Promise<void>;
  updateSettings(patch: Partial<UserSettings>): Promise<UserSettings>;
  pause(kind: PauseKind): Promise<PauseState>;
  resume(): Promise<PauseState>;
  snooze(kind: SnoozeKind): Promise<number>;
  getLibrary(filter: LibraryFilter): Promise<LibraryEntry[]>;
  getReviewQueue(): Promise<LibraryEntry[]>;
  selectCosmetic(id: string | null): Promise<CharacterProgress>;
  exportData(): Promise<string>;
  clearAllData(): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;
  createAccount(): Promise<SyncStatus>;
  getLinkCode(): Promise<{ code: string; expiresAt: number }>;
  linkWithCode(code: string): Promise<SyncStatus>;
  syncNow(): Promise<SyncStatus>;
  unlinkAccount(): Promise<SyncStatus>;
  deleteAccount(): Promise<SyncStatus>;
  planNotifications(): Promise<ScheduledOpportunity[]>;
}
