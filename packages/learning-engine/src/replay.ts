import type { LearningProgress, PlacementResult, QuizAttempt, SkillProfile } from '@jc/shared-types';
import type { ContentLibrary } from '@jc/japanese-content';
import { compareHlc } from '@jc/shared-utils';
import { applyReview, newProgress, seedKnownProgress } from './srs';
import { emptyProfile, kanjiRevealPenalty, profileFromPlacement, updateSkill } from './proficiency';
import { guessRate } from './model';

/**
 * Review state is derived from the append-only attempt log. Replaying the
 * log in a canonical order makes merges across devices deterministic: two
 * devices with the same events always compute the same schedule, and a stale
 * device can never overwrite newer progress.
 */

export function compareAttempts(a: QuizAttempt, b: QuizAttempt): number {
  return a.answeredAt - b.answeredAt || compareHlc(a.hlc, b.hlc) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function latestPlacement(placements: PlacementResult[]): PlacementResult | undefined {
  return placements.slice().sort((a, b) => a.takenAt - b.takenAt || compareHlc(a.hlc, b.hlc)).at(-1);
}

/** Initial progress for items demonstrated in the placement exam. */
export function placementSeeds(placement: PlacementResult | undefined): Map<string, LearningProgress> {
  const out = new Map<string, LearningProgress>();
  if (!placement || placement.skipped) return out;
  for (const a of placement.answers) {
    if (a.correct && !out.has(a.itemId)) out.set(a.itemId, seedKnownProgress(a.itemId, placement.takenAt));
  }
  return out;
}

export interface DerivedState {
  progress: Map<string, LearningProgress>;
  skills: SkillProfile;
}

export function replayAttempts(
  attempts: QuizAttempt[],
  placements: PlacementResult[],
  library: ContentLibrary,
  now: number,
): DerivedState {
  const placement = latestPlacement(placements);
  const progress = placementSeeds(placement);
  let skills = placement ? profileFromPlacement(placement, placement.takenAt) : emptyProfile(now);
  const sorted = attempts.slice().sort(compareAttempts);
  const seen = new Set<string>();
  for (const a of sorted) {
    if (seen.has(a.id)) continue; // idempotent: duplicates are ignored
    seen.add(a.id);
    // Attempts made before a retaken placement still count for scheduling,
    // but the skill profile restarts from the newest placement.
    const item = library.byId.get(a.itemId);
    const prev = progress.get(a.itemId) ?? newProgress(a.itemId, a.answeredAt);
    const est = skills[a.skill];
    progress.set(
      a.itemId,
      applyReview(prev, {
        correct: a.correct,
        now: a.answeredAt,
        latencyMs: a.latencyMs,
        mode: a.mode,
        relativeDifficulty: item ? item.difficulty - est.ability : 0,
      }),
    );
    if (!placement || a.answeredAt >= placement.takenAt) {
      skills = { ...skills, [a.skill]: updateSkill(est, a.difficulty, a.correct, a.mode === 'choice' ? guessRate(4) : 0, a.answeredAt) };
      if (a.readingShown && a.kanjiDifficulty !== undefined && a.skill !== 'kanji') {
        skills = { ...skills, kanji: kanjiRevealPenalty(skills.kanji, a.kanjiDifficulty, a.answeredAt) };
      }
    }
  }
  return { progress, skills };
}
