import { SKILLS, type PlacementResult, type Skill, type SkillEstimate, type SkillProfile } from '@jc/shared-types';
import { clamp } from '@jc/shared-utils';
import { ABILITY_MAX, pCorrect } from './model';

export function defaultEstimate(skill: Skill, now: number, ability = 0.3, uncertainty = 2): SkillEstimate {
  return { skill, ability, uncertainty, evidence: 0, recentAccuracy: 0.5, updatedAt: now };
}

export function emptyProfile(now: number): SkillProfile {
  return Object.fromEntries(SKILLS.map((s) => [s, defaultEstimate(s, now)])) as SkillProfile;
}

/** Skill profile seeded from a placement result. Unassessed skills borrow the overall estimate. */
export function profileFromPlacement(result: PlacementResult, now: number): SkillProfile {
  const profile = emptyProfile(now);
  for (const s of SKILLS) {
    profile[s] = defaultEstimate(s, now, result.overallAbility * 0.85, 1.8);
  }
  for (const c of result.categories) {
    profile[c.skill] = {
      skill: c.skill,
      ability: c.ability,
      uncertainty: c.uncertainty,
      evidence: c.asked,
      recentAccuracy: c.asked ? c.correct / c.asked : 0.5,
      updatedAt: now,
    };
  }
  // Sentence construction and expressions track grammar/vocabulary until measured.
  if (!result.categories.some((c) => c.skill === 'expressions')) {
    profile.expressions = { ...profile.vocabulary, skill: 'expressions', uncertainty: 1.8 };
  }
  if (!result.categories.some((c) => c.skill === 'listening')) {
    profile.listening = { ...profile.vocabulary, skill: 'listening', ability: profile.vocabulary.ability - 0.5, uncertainty: 2 };
  }
  return profile;
}

/**
 * Online (Elo-style) update after one answer. The step size shrinks as
 * evidence accumulates, so a single slip cannot wreck an established estimate.
 */
export function updateSkill(est: SkillEstimate, difficulty: number, correct: boolean, guess: number, now: number): SkillEstimate {
  const expected = pCorrect(est.ability, difficulty, guess);
  const k = clamp(0.9 / (1 + est.evidence / 12), 0.12, 0.9) * clamp(est.uncertainty / 1.2, 0.5, 1.5);
  const outcome = correct ? 1 : 0;
  // Guessable questions carry less information when answered correctly.
  const weight = correct ? 1 - guess : 1;
  // One answer moves the estimate by at most 0.6 so a single slip or lucky guess cannot dominate.
  const step = clamp(k * weight * (outcome - expected) * 1.2, -0.6, 0.6);
  const ability = clamp(est.ability + step, 0, ABILITY_MAX);
  return {
    skill: est.skill,
    ability: Math.round(ability * 1000) / 1000,
    uncertainty: Math.max(0.35, Math.round(est.uncertainty * 0.97 * 1000) / 1000),
    evidence: est.evidence + 1,
    recentAccuracy: Math.round((est.recentAccuracy * 0.9 + outcome * 0.1) * 1000) / 1000,
    updatedAt: now,
  };
}

/**
 * Revealing the reading of kanji means at least one of them couldn't be read:
 * count it as a missed kanji question at that difficulty.
 */
export function kanjiRevealPenalty(est: SkillEstimate, kanjiDifficulty: number, now: number): SkillEstimate {
  return updateSkill(est, kanjiDifficulty, false, 0, now);
}

const OVERALL_WEIGHTS: Partial<Record<Skill, number>> = {
  vocabulary: 0.24,
  kanji: 0.16,
  grammar: 0.2,
  particles: 0.1,
  conjugation: 0.08,
  sentences: 0.06,
  reading: 0.06,
};

export function overallAbility(profile: SkillProfile): number {
  let sum = 0;
  let w = 0;
  for (const [skill, weight] of Object.entries(OVERALL_WEIGHTS) as Array<[Skill, number]>) {
    sum += profile[skill].ability * weight;
    w += weight;
  }
  return w ? sum / w : 0;
}

/** Skill furthest below the learner's overall level (among enabled skills). */
export function weakestSkills(profile: SkillProfile, enabled: Skill[], count = 2): Skill[] {
  return enabled
    .filter((s) => s !== 'listening')
    .slice()
    .sort((a, b) => profile[a].ability + profile[a].recentAccuracy * 2 - (profile[b].ability + profile[b].recentAccuracy * 2))
    .slice(0, count);
}
