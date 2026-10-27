import type { LearningProgress, ResponseMode } from '@jc/shared-types';
import { DAY, MINUTE, clamp, hashString } from '@jc/shared-utils';

/**
 * Spaced repetition based on SM-2 with Anki-style learning steps.
 * Kept behind this small interface so the algorithm can be replaced (e.g. by
 * FSRS) without touching callers.
 */
export interface SrsConfig {
  learningStepsMinutes: number[];
  relearningStepsMinutes: number[];
  graduatingIntervalDays: number;
  easyIntervalDays: number;
  startingEase: number;
  minEase: number;
  maxIntervalDays: number;
  lapseIntervalFactor: number;
  retainedIntervalDays: number;
  retainedStreak: number;
  fuzz: number;
}

export const DEFAULT_SRS: SrsConfig = {
  // Steps are spread across a day because sessions arrive as short interruptions.
  learningStepsMinutes: [10, 240],
  relearningStepsMinutes: [10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEase: 2.5,
  minEase: 1.3,
  maxIntervalDays: 365,
  lapseIntervalFactor: 0.3,
  retainedIntervalDays: 21,
  retainedStreak: 3,
  fuzz: 0.05,
};

/** SM-2 quality grade, 0–5. */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewOutcome {
  correct: boolean;
  now: number;
  latencyMs?: number;
  mode?: ResponseMode;
  /** Item difficulty minus learner ability; positive means harder than the learner. */
  relativeDifficulty?: number;
}

export function gradeAnswer(o: Pick<ReviewOutcome, 'correct' | 'latencyMs' | 'mode'>): Grade {
  if (!o.correct) return 1;
  const latency = o.latencyMs;
  if (latency === undefined) return 4;
  const fast = o.mode === 'typed' ? 8_000 : 4_000;
  const slow = o.mode === 'typed' ? 25_000 : 15_000;
  if (latency <= fast) return 5;
  if (latency >= slow) return 3;
  return 4;
}

export function newProgress(itemId: string, now: number): LearningProgress {
  return {
    itemId,
    firstSeenAt: now,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
    lapses: 0,
    lastReviewedAt: now,
    nextReviewAt: now,
    intervalDays: 0,
    ease: DEFAULT_SRS.startingEase,
    step: 0,
    status: 'new',
  };
}

function fuzzed(days: number, seed: string, config: SrsConfig): number {
  if (days < 2) return days;
  const r = (hashString(seed) % 1000) / 1000; // deterministic 0..1
  return days * (1 + (r * 2 - 1) * config.fuzz);
}

/**
 * Estimated probability of recall right now (forgetting curve calibrated so
 * recall is 90% when the scheduled interval elapses).
 */
export function retrievability(p: LearningProgress, now: number): number {
  if (p.status === 'new') return 0;
  const intervalMs = Math.max(p.intervalDays * DAY, (p.nextReviewAt - p.lastReviewedAt) || MINUTE);
  const elapsed = Math.max(0, now - p.lastReviewedAt);
  return Math.pow(0.9, elapsed / intervalMs);
}

export function isDue(p: LearningProgress, now: number): boolean {
  return p.status !== 'new' && p.nextReviewAt <= now;
}

export function applyReview(prev: LearningProgress, outcome: ReviewOutcome, config: SrsConfig = DEFAULT_SRS): LearningProgress {
  const now = outcome.now;
  const grade = gradeAnswer(outcome);
  const p: LearningProgress = { ...prev };
  // Clock moved backwards (manual change, bad sync): never schedule into the past.
  const elapsedDays = Math.max(0, now - prev.lastReviewedAt) / DAY;
  p.attempts += 1;
  if (p.attempts === 1) p.firstSeenAt = Math.min(prev.firstSeenAt, now);
  p.lastReviewedAt = Math.max(now, 0);
  if (outcome.latencyMs !== undefined && outcome.latencyMs > 0) {
    const l = Math.min(outcome.latencyMs, 120_000);
    p.avgLatencyMs = p.avgLatencyMs === undefined ? l : Math.round(p.avgLatencyMs * 0.7 + l * 0.3);
  }
  const hardness = clamp(outcome.relativeDifficulty ?? 0, -3, 3);
  const seed = `${p.itemId}:${p.attempts}`;

  if (outcome.correct) {
    p.correct += 1;
    p.streak += 1;
  } else {
    p.incorrect += 1;
    p.streak = 0;
    p.lastWrongAt = now;
  }

  const inSteps = p.status === 'new' || p.status === 'learning' || p.status === 'relearning';
  if (inSteps) {
    const steps = p.status === 'relearning' ? config.relearningStepsMinutes : config.learningStepsMinutes;
    if (p.status === 'new') {
      // Harder-than-ability items start with a lower ease.
      p.ease = clamp(config.startingEase - Math.max(0, hardness) * 0.1, config.minEase, config.startingEase);
    }
    if (!outcome.correct) {
      p.status = p.status === 'relearning' ? 'relearning' : 'learning';
      p.step = 0;
      p.nextReviewAt = now + (steps[0] ?? 10) * MINUTE;
      return p;
    }
    const graduateEarly = grade === 5 && p.status === 'new' && hardness <= -1;
    const nextStep = p.step + 1;
    if (graduateEarly || nextStep >= steps.length) {
      const base = p.status === 'relearning'
        ? Math.max(1, p.intervalDays)
        : graduateEarly ? config.easyIntervalDays : config.graduatingIntervalDays;
      p.status = 'reviewing';
      p.step = 0;
      p.intervalDays = Math.round(fuzzed(base, seed, config) * 100) / 100;
      p.nextReviewAt = now + p.intervalDays * DAY;
      return p;
    }
    p.status = p.status === 'relearning' ? 'relearning' : 'learning';
    p.step = nextStep;
    p.nextReviewAt = now + (steps[nextStep] ?? 10) * MINUTE;
    return p;
  }

  // Review phase (reviewing / retained).
  if (!outcome.correct) {
    p.lapses += 1;
    p.ease = Math.max(config.minEase, p.ease - 0.2);
    p.intervalDays = Math.max(1, Math.round(p.intervalDays * config.lapseIntervalFactor * 100) / 100);
    p.status = 'relearning';
    p.step = 0;
    p.nextReviewAt = now + (config.relearningStepsMinutes[0] ?? 10) * MINUTE;
    return p;
  }

  const q = grade;
  p.ease = clamp(p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), config.minEase, 3.0);
  // Reviewed late but still remembered: credit part of the extra time.
  const effective = elapsedDays > p.intervalDays ? p.intervalDays + (elapsedDays - p.intervalDays) / 2 : Math.max(p.intervalDays, elapsedDays);
  let next = Math.max(effective * p.ease, p.intervalDays + 1);
  if (q === 3) next = Math.max(p.intervalDays + 1, effective * 1.2);
  next = Math.min(config.maxIntervalDays, fuzzed(next, seed, config));
  p.intervalDays = Math.round(next * 100) / 100;
  p.nextReviewAt = now + p.intervalDays * DAY;
  p.status = p.intervalDays >= config.retainedIntervalDays && p.streak >= config.retainedStreak ? 'retained' : 'reviewing';
  return p;
}

/** Seed progress for something the learner demonstrated during placement. */
export function seedKnownProgress(itemId: string, now: number, intervalDays = 3): LearningProgress {
  return {
    ...newProgress(itemId, now),
    attempts: 1,
    correct: 1,
    streak: 1,
    status: 'reviewing',
    intervalDays,
    nextReviewAt: now + intervalDays * DAY,
  };
}
