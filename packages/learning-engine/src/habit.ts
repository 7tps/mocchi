import type { CharacterMood, LearningSession } from '@jc/shared-types';
import { DAY, MINUTE, addDaysToKey, localDateKey } from '@jc/shared-utils';

/**
 * Mocchi's resting mood follows the learner's habit: how recently and how
 * regularly sessions are completed, and whether check-ins are being skipped.
 * Pure and deterministic; momentary moods (a correct answer, a prompt) are
 * layered on top by the UI.
 */
export type HabitState = 'new' | 'thriving' | 'steady' | 'skipping' | 'missed' | 'away';

export interface Habit {
  state: HabitState;
  mood: CharacterMood;
  /** Whole days since the last completed session (null if none yet). */
  daysSinceStudy: number | null;
  /** Whole days without a session (since onboarding if there was none yet). */
  daysAway: number;
  /** Local days with a completed session in the last 7, today included. */
  activeDays: number;
  /** Check-ins in the last 24 hours that were closed without finishing. */
  skippedCheckIns: number;
  /** Human-readable explanation (English; UIs show their own i18n line). */
  reason: string;
}

export interface HabitInput {
  now: number;
  timeZone: string;
  sessions: ReadonlyArray<Pick<LearningSession, 'type' | 'startedAt' | 'completedAt' | 'questionCount' | 'localDate'>>;
  /** When the learner finished onboarding; a fresh start isn't "missed". */
  onboardedAt?: number;
  goalReachedToday: boolean;
}

/** A check-in this recent may still be on screen: it isn't skipped yet. */
const IN_PROGRESS_MS = 15 * MINUTE;
const MOODS: Record<HabitState, CharacterMood> = {
  new: 'idle',
  thriving: 'happy',
  steady: 'idle',
  skipping: 'sad',
  missed: 'waiting',
  away: 'sad',
};

export function assessHabit(i: HabitInput): Habit {
  const today = localDateKey(i.now, i.timeZone);
  const done = i.sessions.filter((s) => s.completedAt !== undefined && s.questionCount > 0);
  const lastDone = done.reduce<number | null>((m, s) => Math.max(m ?? 0, s.completedAt as number), null);
  const week = new Set(Array.from({ length: 7 }, (_, k) => addDaysToKey(today, -k)));
  const activeDays = new Set(done.filter((s) => week.has(s.localDate)).map((s) => s.localDate)).size;
  const studiedToday = done.some((s) => s.localDate === today);

  // Check-ins (not self-started sessions) closed without finishing, since the last finished session.
  const prompted = i.sessions.filter((s) => (s.type === 'scheduled' || s.type === 'notification') && s.startedAt >= i.now - DAY && s.startedAt <= i.now - IN_PROGRESS_MS);
  const skipped = prompted.filter((s) => s.completedAt === undefined && (lastDone === null || s.startedAt > lastDone)).length;

  const since = lastDone ?? i.onboardedAt ?? null;
  const daysSinceStudy = lastDone === null ? null : Math.floor((i.now - lastDone) / DAY);
  const idleDays = since === null ? 0 : (i.now - since) / DAY;

  const result = (state: HabitState, reason: string): Habit => ({ state, mood: MOODS[state], daysSinceStudy, daysAway: Math.floor(idleDays), activeDays, skippedCheckIns: skipped, reason });
  if (i.goalReachedToday || (studiedToday && activeDays >= 4)) return result('thriving', `Studied ${activeDays} of the last 7 days${i.goalReachedToday ? ' and reached today’s goal' : ''}.`);
  if (skipped >= 2) return result('skipping', `${skipped} check-ins closed without a session since the last one you finished.`);
  if (lastDone === null && idleDays < 1) return result('new', 'Just getting started.');
  if (studiedToday || idleDays < 1) return result('steady', 'Studied within the last day.');
  if (idleDays < 3) return result('missed', `${Math.floor(idleDays)} day${Math.floor(idleDays) === 1 ? '' : 's'} since the last session.`);
  return result('away', `${Math.floor(idleDays)} days since the last session.`);
}

/**
 * The mood Mocchi shows when nothing is happening. Pauses and quiet hours
 * mean sleep; strong habit signals (thriving, skipped check-ins, a long
 * absence) come next; otherwise due reviews make Mocchi wait for you.
 */
export function restingMood(habit: Pick<Habit, 'state' | 'mood'>, opts: { paused: boolean; quiet?: boolean; due: number }): CharacterMood {
  if (opts.paused || opts.quiet) return 'sleepy';
  if (habit.state === 'thriving' || habit.state === 'skipping' || habit.state === 'away') return habit.mood;
  return opts.due > 0 ? 'waiting' : habit.mood;
}
