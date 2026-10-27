/**
 * Shared domain model for the Japanese companion.
 *
 * All timestamps are epoch milliseconds (UTC). Local-calendar concepts
 * (streak days, quiet hours) are always derived together with an explicit
 * IANA timezone so behaviour survives travel and clock changes.
 */

export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Skills and content
// ---------------------------------------------------------------------------

export const SKILLS = [
  'hiragana',
  'katakana',
  'vocabulary',
  'kanji',
  'grammar',
  'particles',
  'conjugation',
  'sentences',
  'reading',
  'listening',
  'expressions',
] as const;
export type Skill = (typeof SKILLS)[number];

export type ItemType =
  | 'kana'
  | 'vocab'
  | 'kanji'
  | 'grammar'
  | 'particle'
  | 'conjugation'
  | 'expression'
  | 'reading';

export type JlptBand = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type PartOfSpeech =
  | 'noun'
  | 'pronoun'
  | 'verb-godan'
  | 'verb-ichidan'
  | 'verb-suru'
  | 'verb-kuru'
  | 'adj-i'
  | 'adj-na'
  | 'adverb'
  | 'counter'
  | 'expression'
  | 'particle'
  | 'conjunction'
  | 'number'
  | 'prefix'
  | 'suffix'
  | 'interjection';

export interface ExampleSentence {
  ja: string;
  reading: string;
  en: string;
}

export interface SourceInfo {
  /** Short identifier of the dataset, e.g. "jc-curated". */
  id: string;
  license: string;
  attribution?: string;
}

/** A question template baked into the content (grammar/particle/reading drills). */
export interface ContentExercise {
  id: string;
  kind: 'fill-blank' | 'choose-sentence' | 'arrange' | 'comprehension';
  /** Prompt sentence; use ＿＿ for the blank in fill-blank drills. */
  prompt: string;
  promptReading?: string;
  /** English gloss of the prompt shown under it. */
  promptEn?: string;
  /** For comprehension questions: the question asked about the passage. */
  question?: string;
  answer: string;
  /** Additional accepted answers (typed responses). */
  alsoAccept?: string[];
  /** Wrong options for multiple choice. For arrange, unused. */
  distractors?: string[];
  /** For arrange: tokens in correct order. */
  tokens?: string[];
  explanation: string;
  difficulty?: number;
  /** Why each distractor is wrong, keyed by distractor text (level packs carry these inline). */
  distractorNotes?: Record<string, string>;
}

export interface LearningItem {
  id: string;
  type: ItemType;
  /** Primary written form (word, kana, kanji, grammar pattern). */
  ja: string;
  /** Kana reading (hiragana for vocab, may be empty for kana itself). */
  reading: string;
  romaji?: string;
  /** Accepted English meanings; the first is canonical. */
  meanings: string[];
  partOfSpeech?: PartOfSpeech;
  examples: ExampleSentence[];
  /** Calibrated difficulty on the 0–10 engine scale. */
  difficulty: number;
  jlpt?: JlptBand;
  skills: Skill[];
  tags: string[];
  /** Curriculum ordering hint, lower first. */
  order: number;
  /** 0..1 – how central the item is to the curriculum. */
  importance: number;
  notes?: string;
  audio?: string;
  source: SourceInfo;
  // Kanji-specific
  onyomi?: string[];
  kunyomi?: string[];
  components?: string[];
  relatedVocab?: string[];
  // Grammar-specific
  formation?: string;
  commonMistakes?: string[];
  confusedWith?: string[];
  exercises?: ContentExercise[];
  /** For readings: the passage. */
  passage?: ExampleSentence;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export type QuestionFormat =
  | 'ja-to-en'
  | 'en-to-ja'
  | 'kana-to-romaji'
  | 'romaji-to-kana'
  | 'word-to-reading'
  | 'kanji-meaning'
  | 'kanji-reading'
  | 'fill-particle'
  | 'conjugate'
  | 'choose-sentence'
  | 'arrange'
  | 'fill-blank'
  | 'translation'
  | 'comprehension'
  | 'listening';

export type ResponseMode = 'choice' | 'typed' | 'arrange';

export type AnswerScript = 'kana' | 'english' | 'romaji' | 'japanese';

export interface Question {
  id: string;
  itemId: string;
  format: QuestionFormat;
  mode: ResponseMode;
  skill: Skill;
  difficulty: number;
  /** Instruction line, e.g. "What does this mean?" */
  instruction: string;
  /** Main prompt (Japanese or English). */
  prompt: string;
  promptReading?: string;
  promptSub?: string;
  /** Text shown above the prompt (e.g. reading passage). */
  context?: string;
  contextReading?: string;
  contextEn?: string;
  choices?: string[];
  /** Optional reading shown under each choice (same order as choices). */
  choiceHints?: string[];
  tokens?: string[];
  /** Canonical answer shown in feedback. */
  answer: string;
  accepted: string[];
  answerScript: AnswerScript;
  explanation: string;
  example?: ExampleSentence;
  /** Text to speak for listening prompts. */
  speak?: string;
  /** Why the engine picked this question (shown on request). */
  reason?: string;
  /**
   * Present when answering depends on reading kanji the learner might not know:
   * the difficulty of the hardest kanji involved. Revealing the reading, or
   * saying the kanji can't be read, counts against the kanji skill only.
   */
  kanjiDifficulty?: number;
  /** Why each wrong option (or typical typed mistake) is wrong. Kept from the UI until answered. */
  choiceNotes?: Record<string, string>;
}

/** How the learner answered, beyond the response itself. */
export interface AnswerMeta {
  /** The learner revealed the kana reading of kanji before answering. */
  readingShown?: boolean;
  /** The learner said they could not read the kanji (placement only). */
  cantReadKanji?: boolean;
}

export interface AnswerCheck {
  correct: boolean;
  /** Accepted answer that matched, if any. */
  matched?: string;
  /** Nuance such as "Typo accepted" or "Also correct: …". */
  note?: string;
  normalizedResponse: string;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export type LearningStatus = 'new' | 'learning' | 'reviewing' | 'retained' | 'relearning';

export interface LearningProgress {
  itemId: string;
  firstSeenAt: number;
  attempts: number;
  correct: number;
  incorrect: number;
  streak: number;
  lapses: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  /** Interval in days used for the current schedule. */
  intervalDays: number;
  ease: number;
  /** Learning step index while status is learning / relearning. */
  step: number;
  status: LearningStatus;
  /** Exponential moving average of response latency in ms. */
  avgLatencyMs?: number;
  /** Last answer was wrong — used to prioritise recently missed items. */
  lastWrongAt?: number;
}

export interface SkillEstimate {
  skill: Skill;
  /** Ability on the 0–10 difficulty scale. */
  ability: number;
  /** Uncertainty (standard error) of the ability. */
  uncertainty: number;
  evidence: number;
  /** Rolling accuracy of the last ~20 answers in this skill. */
  recentAccuracy: number;
  updatedAt: number;
}

export type SkillProfile = Record<Skill, SkillEstimate>;

export type Platform = 'desktop' | 'mobile' | 'web';

export interface QuizAttempt {
  id: string;
  sessionId: string;
  itemId: string;
  format: QuestionFormat;
  mode: ResponseMode;
  skill: Skill;
  difficulty: number;
  /** Submitted answer — stored locally only for the user's own history. */
  response: string;
  correct: boolean;
  latencyMs?: number;
  /** Reading was revealed: replay applies the same kanji-skill penalty. */
  readingShown?: boolean;
  kanjiDifficulty?: number;
  answeredAt: number;
  deviceId: string;
  /** Hybrid logical clock stamp used to order events across devices. */
  hlc: string;
}

export type SessionType = 'scheduled' | 'manual' | 'notification' | 'review' | 'placement';

export interface LearningSession {
  id: string;
  platform: Platform;
  type: SessionType;
  startedAt: number;
  completedAt?: number;
  questionCount: number;
  correctCount: number;
  /** Local calendar day (YYYY-MM-DD) in the user's timezone at start. */
  localDate: string;
  xpAwarded: number;
  deviceId: string;
  hlc: string;
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export type ExperienceLevel = 'none' | 'kana' | 'beginner' | 'intermediate' | 'advanced';

export interface PlacementCategoryResult {
  skill: Skill;
  ability: number;
  uncertainty: number;
  asked: number;
  correct: number;
  /** 0–100 display score. */
  score: number;
  /** Questions skipped because the kanji couldn't be read (no evidence for this skill). */
  kanjiBlocked?: number;
}

export interface PlacementResult {
  id: string;
  takenAt: number;
  experience: ExperienceLevel;
  /** True if the user explicitly chose to start as a beginner. */
  skipped: boolean;
  overallAbility: number;
  overallScore: number;
  band: JlptBand | 'pre-N5';
  /** Whether evidence is strong enough to show the band without "≈". */
  bandConfident: boolean;
  categories: PlacementCategoryResult[];
  knownKana: string[];
  unknownKana: string[];
  strengths: Skill[];
  weaknesses: Skill[];
  recommendedDifficulty: number;
  questionCount: number;
  durationMs: number;
  answers: Array<{ itemId: string; skill: Skill; difficulty: number; correct: boolean }>;
  hlc: string;
}

// ---------------------------------------------------------------------------
// Profile, settings, character
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  displayName?: string;
  createdAt: number;
  timezone: string;
  experience: ExperienceLevel;
  onboardedAt?: number;
}

export interface QuietHours {
  enabled: boolean;
  /** Minutes since local midnight. */
  start: number;
  end: number;
}

export type ThemeName = 'night' | 'paper';

export interface UserSettings {
  dailyGoalQuestions: number;
  sessionLength: number; // questions per session (2–5)
  enabledSkills: Skill[];
  newItemsPerSession: number;
  quietHours: QuietHours;
  // Desktop
  popupEnabled: boolean;
  popupIntervalMinMinutes: number;
  popupIntervalMaxMinutes: number;
  popupTakesFocus: boolean;
  maxDailyInterruptions: number;
  minMinutesBetweenInterruptions: number;
  launchAtStartup: boolean;
  characterVisible: boolean;
  desktopNotifications: boolean;
  notifyAlongsidePopup: boolean;
  // Mobile
  notificationsEnabled: boolean;
  notificationCategories: {
    reviews: boolean;
    streak: boolean;
    milestones: boolean;
  };
  reminderTimes: number[]; // minutes since midnight
  mobileRemindersPerDay: number;
  haptics: boolean;
  // Shared presentation
  characterAnimation: boolean;
  soundEffects: boolean;
  showRomaji: boolean;
  showTranslations: boolean;
  theme: ThemeName;
  reducedMotion: boolean;
  syncEnabled: boolean;
  syncServerUrl: string;
  /** Per-field update stamps (HLC) for last-writer-wins merging. */
  updatedAt: Partial<Record<keyof Omit<UserSettings, 'updatedAt'>, string>>;
}

export interface PauseState {
  /** Epoch ms when the pause ends; Infinity-like sentinel for indefinitely. */
  until: number | null;
  indefinite: boolean;
}

export interface CharacterProgress {
  xp: number;
  level: number;
  unlocked: string[];
  selectedCosmetic: string | null;
  milestones: string[];
}

export type CharacterMood =
  | 'idle'
  | 'blink'
  | 'happy'
  | 'thinking'
  | 'curious'
  | 'confused'
  | 'sleepy'
  | 'celebrating'
  | 'encouraging'
  | 'studying'
  | 'waiting';

export interface Device {
  id: string;
  platform: Platform;
  timezone: string;
  notificationPermission: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  lastSyncAt?: number;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export interface ScheduledOpportunity {
  at: number;
  reason: string;
  kind: 'review' | 'streak' | 'new-material' | 'milestone';
}

export interface SchedulerDecision {
  show: boolean;
  reason: string;
  /** When the scheduler should look again. */
  nextCheckAt: number;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export type SyncEvent =
  | { type: 'attempt'; id: string; hlc: string; payload: QuizAttempt }
  | { type: 'session'; id: string; hlc: string; payload: LearningSession }
  | { type: 'placement'; id: string; hlc: string; payload: PlacementResult }
  | { type: 'settings'; id: string; hlc: string; payload: Partial<UserSettings> }
  | { type: 'profile'; id: string; hlc: string; payload: UserProfile };

export interface SyncRequest {
  schemaVersion: number;
  deviceId: string;
  /** Server sequence number of the last event this device has seen. */
  cursor: number;
  events: SyncEvent[];
}

export interface SyncResponse {
  /** Event ids the server stored (or already had). */
  accepted: string[];
  /** Events from other devices after `cursor`. */
  events: SyncEvent[];
  cursor: number;
  more: boolean;
  serverTime: number;
}

export interface AccountResponse {
  userId: string;
  token: string;
}

export interface LinkCodeResponse {
  code: string;
  expiresAt: number;
}

export interface SyncStatus {
  enabled: boolean;
  linked: boolean;
  lastSyncAt?: number;
  pending: number;
  lastError?: string;
}
