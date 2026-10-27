/**
 * Shared ability model: the probability that a learner with `ability`
 * answers an item of `difficulty` correctly (both on the 0–10 scale).
 * A 3-parameter logistic curve: slope, plus a guessing floor for
 * multiple-choice questions.
 */
export const SLOPE = 1.25;

export function pCorrect(ability: number, difficulty: number, guess = 0): number {
  const p = 1 / (1 + Math.exp(-SLOPE * (ability - difficulty)));
  return guess + (1 - guess) * p;
}

export function guessRate(choiceCount: number | undefined): number {
  return choiceCount && choiceCount > 1 ? 1 / choiceCount : 0;
}

export const ABILITY_MIN = -1;
export const ABILITY_MAX = 10.5;
