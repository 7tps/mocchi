import type { JlptBand, Skill } from '@jc/shared-types';
import { clamp } from '@jc/shared-utils';

/**
 * How a skill estimate is shown to learners: "X% to NY", where NY is the next
 * JLPT level not yet mastered and X is progress through that level. Abilities
 * are on the engine's shared 0–10 difficulty scale; a level counts as mastered
 * at the top of its band (the same boundaries as `bandForAbility`).
 */
export interface JlptProgress {
  /** Level being worked towards (N1 once everything below is mastered). */
  level: JlptBand;
  /** 0–100 progress through that level; 100 only when mastered. */
  percent: number;
  /** True for kana once mastered, or N1 once mastered. */
  mastered: boolean;
  /** Kana skills are a prerequisite, not a JLPT level. */
  kana: boolean;
}

/** [level, ability where the level starts, ability where it is mastered]. */
export const LEVEL_LADDER: ReadonlyArray<readonly [JlptBand, number, number]> = [
  ['N5', 0, 3.0],
  ['N4', 3.0, 4.8],
  ['N3', 4.8, 6.5],
  ['N2', 6.5, 8.0],
  ['N1', 8.0, 9.4],
];

/**
 * Kana items top out near difficulty 1.7, so a perfect kana score can't push
 * ability far up the shared scale. Kana count as mastered where the hardest
 * kana (difficulty 1.7) is answered correctly ~75% of the time without
 * guessing, so a perfect kana run in the placement exam reads as mastered.
 */
export const KANA_MASTERY_ABILITY = 2.6;

function percentOf(ability: number, lo: number, hi: number): number {
  // Floor so 100% is shown only at mastery.
  return Math.floor(clamp((ability - lo) / (hi - lo), 0, 0.999) * 100);
}

export function jlptProgress(ability: number, skill?: Skill): JlptProgress {
  if (skill === 'hiragana' || skill === 'katakana') {
    const mastered = ability >= KANA_MASTERY_ABILITY;
    return { level: 'N5', percent: mastered ? 100 : percentOf(ability, 0, KANA_MASTERY_ABILITY), mastered, kana: true };
  }
  for (const [level, lo, hi] of LEVEL_LADDER) {
    if (ability < hi) return { level, percent: percentOf(ability, lo, hi), mastered: false, kana: false };
  }
  return { level: 'N1', percent: 100, mastered: true, kana: false };
}
