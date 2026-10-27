import type {
  AnswerMeta,
  ExperienceLevel,
  JlptBand,
  LearningItem,
  PlacementCategoryResult,
  PlacementResult,
  Question,
  QuestionFormat,
  Skill,
} from '@jc/shared-types';
import type { ContentLibrary } from '@jc/japanese-content';
import { clamp, createId, createRng, pick, type Rng } from '@jc/shared-utils';
import { buildQuestion } from './questions';
import { checkAnswer } from './answers';
import { ABILITY_MAX, ABILITY_MIN, guessRate, pCorrect } from './model';

/**
 * Adaptive placement exam. Each skill keeps a discretised posterior over
 * ability; questions are chosen near the current estimate (most informative)
 * and the exam stops once estimates are confident or the question budget is
 * spent. Scores therefore account for question difficulty and guessing, not
 * just the number of correct answers.
 */

export interface PlacementConfig {
  minQuestions: number;
  maxQuestions: number;
  minPerSkill: number;
  maxPerSkill: number;
  /** Posterior SD below which a skill counts as measured. */
  targetSd: number;
  skills: Skill[];
}

export const DEFAULT_PLACEMENT: PlacementConfig = {
  minQuestions: 20,
  maxQuestions: 40,
  minPerSkill: 2,
  maxPerSkill: 6,
  targetSd: 0.85,
  skills: ['hiragana', 'katakana', 'vocabulary', 'particles', 'grammar', 'conjugation', 'kanji', 'sentences', 'reading'],
};

const GRID_STEP = 0.1;
const GRID: number[] = Array.from({ length: Math.round((ABILITY_MAX - ABILITY_MIN) / GRID_STEP) + 1 }, (_, i) => ABILITY_MIN + i * GRID_STEP);

const PRIORS: Record<ExperienceLevel, { mean: number; sd: number; kana?: number }> = {
  none: { mean: 0.2, sd: 1.6, kana: 0.2 },
  kana: { mean: 0.9, sd: 1.6, kana: 1.6 },
  beginner: { mean: 2.0, sd: 1.8, kana: 2.0 },
  intermediate: { mean: 4.2, sd: 2.0, kana: 2.5 },
  advanced: { mean: 6.5, sd: 2.2, kana: 2.5 },
};

export interface PlacementAnswer {
  questionId: string;
  itemId: string;
  skill: Skill;
  difficulty: number;
  guess: number;
  correct: boolean;
  dontKnow: boolean;
  /** Extra kanji evidence derived from a revealed reading; not a question of its own. */
  derived?: boolean;
  /** Skipped because the kanji couldn't be read: no evidence for this skill. */
  kanjiBlocked?: boolean;
  latencyMs?: number;
}

export interface PlacementState {
  id: string;
  seed: string;
  experience: ExperienceLevel;
  startedAt: number;
  config: PlacementConfig;
  /** Log-posterior per skill over GRID. */
  posteriors: Record<string, number[]>;
  answers: PlacementAnswer[];
  askedItems: string[];
  current: (Question & { placementSkill: Skill }) | null;
  finished: boolean;
}

function normalLogPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return -0.5 * z * z;
}

function stats(logPost: number[]): { mean: number; sd: number } {
  const max = Math.max(...logPost);
  let total = 0;
  let mean = 0;
  const w = logPost.map((l) => Math.exp(l - max));
  for (let i = 0; i < GRID.length; i++) {
    total += w[i] as number;
    mean += (w[i] as number) * (GRID[i] as number);
  }
  mean /= total;
  let v = 0;
  for (let i = 0; i < GRID.length; i++) v += (w[i] as number) * ((GRID[i] as number) - mean) ** 2;
  return { mean, sd: Math.sqrt(v / total) };
}

export function skillEstimate(state: PlacementState, skill: Skill): { mean: number; sd: number } {
  const post = state.posteriors[skill];
  return post ? stats(post) : { mean: 0, sd: 3 };
}

export function startPlacement(experience: ExperienceLevel, now: number, seed: string = createId(now), config: PlacementConfig = DEFAULT_PLACEMENT): PlacementState {
  const prior = PRIORS[experience];
  const posteriors: Record<string, number[]> = {};
  for (const skill of config.skills) {
    const isKana = skill === 'hiragana' || skill === 'katakana';
    const mean = isKana ? (prior.kana ?? prior.mean) : prior.mean;
    posteriors[skill] = GRID.map((t) => normalLogPdf(t, mean, prior.sd));
  }
  return { id: createId(now), seed, experience, startedAt: now, config, posteriors, answers: [], askedItems: [], current: null, finished: false };
}

/** Questions actually shown (derived kanji evidence is not a question). */
function questionCount(state: PlacementState): number {
  return state.answers.filter((a) => !a.derived).length;
}

function blockedIn(state: PlacementState, skill: Skill): number {
  return state.answers.filter((a) => a.skill === skill && a.kanjiBlocked).length;
}

function askedIn(state: PlacementState, skill: Skill): number {
  return state.answers.filter((a) => a.skill === skill).length;
}

/** Hiragana must be readable before kana-dependent skills are meaningful. */
function kanaBlocked(state: PlacementState, skill: Skill): boolean {
  if (skill === 'hiragana') return false;
  const h = skillEstimate(state, 'hiragana');
  return askedIn(state, 'hiragana') >= 2 && h.mean < 0.8 && h.sd < 1.2;
}

function skillSettled(state: PlacementState, skill: Skill): boolean {
  const n = askedIn(state, skill);
  const { sd } = skillEstimate(state, skill);
  if (n >= state.config.maxPerSkill) return true;
  if (kanaBlocked(state, skill) && n >= 1) return true;
  // Twice unreadable because of kanji: this skill can't be measured with kanji text yet.
  if (blockedIn(state, skill) >= 2) return true;
  return n >= state.config.minPerSkill && sd < state.config.targetSd;
}

function poolFor(skill: Skill, lib: ContentLibrary): Array<{ item: LearningItem; format: QuestionFormat; difficulty: number }> {
  const out: Array<{ item: LearningItem; format: QuestionFormat; difficulty: number }> = [];
  for (const item of lib.items) {
    switch (skill) {
      case 'hiragana':
      case 'katakana':
        if (item.type === 'kana' && item.skills[0] === skill) out.push({ item, format: 'kana-to-romaji', difficulty: item.difficulty });
        break;
      case 'vocabulary':
        if (item.type === 'vocab' && !item.tags.includes('loanword')) out.push({ item, format: 'ja-to-en', difficulty: item.difficulty });
        break;
      case 'kanji':
        if (item.type === 'kanji') {
          out.push({ item, format: 'kanji-meaning', difficulty: item.difficulty });
          if (item.exercises?.length) out.push({ item, format: 'kanji-reading', difficulty: item.difficulty + 0.2 });
        }
        break;
      case 'grammar':
        if (item.type === 'grammar') {
          if (item.exercises?.some((e) => e.kind === 'fill-blank')) out.push({ item, format: 'fill-blank', difficulty: item.difficulty });
          if (item.exercises?.some((e) => e.kind === 'choose-sentence')) out.push({ item, format: 'choose-sentence', difficulty: item.difficulty + 0.1 });
        }
        break;
      case 'particles':
        if (item.type === 'particle') out.push({ item, format: 'fill-particle', difficulty: item.difficulty });
        break;
      case 'conjugation':
        if (item.type === 'conjugation') out.push({ item, format: 'conjugate', difficulty: item.difficulty });
        break;
      case 'sentences':
        if (item.type === 'vocab' && item.examples.length) out.push({ item, format: 'translation', difficulty: item.difficulty + 0.4 });
        break;
      case 'reading':
        if (item.type === 'reading') out.push({ item, format: 'comprehension', difficulty: item.difficulty });
        break;
      case 'listening':
        if (item.type === 'vocab') out.push({ item, format: 'listening', difficulty: item.difficulty + 0.5 });
        break;
      default:
        break;
    }
  }
  return out;
}

function chooseSkill(state: PlacementState): Skill | null {
  const order = state.config.skills;
  const total = questionCount(state);
  const open = order.filter((s) => !skillSettled(state, s));
  if (open.length) {
    // Breadth first: the least-asked open skill, in curriculum order.
    let best: Skill | null = null;
    let bestN = Infinity;
    for (const s of open) {
      const n = askedIn(state, s);
      if (n < bestN) {
        best = s;
        bestN = n;
      }
    }
    return best;
  }
  if (total < state.config.minQuestions) {
    // Everything is measured but the budget is not used: refine the least certain skill.
    const candidates = order.filter((s) => askedIn(state, s) < state.config.maxPerSkill + 2 && !(kanaBlocked(state, s) && askedIn(state, s) >= 2));
    if (!candidates.length) return null;
    return candidates.reduce((a, b) => (skillEstimate(state, a).sd >= skillEstimate(state, b).sd ? a : b));
  }
  return null;
}

/** Choose and build the next question, or mark the exam finished. */
export function nextPlacementQuestion(state: PlacementState, lib: ContentLibrary, listening = false): PlacementState {
  if (state.finished) return state;
  if (questionCount(state) >= state.config.maxQuestions) return { ...state, current: null, finished: true };
  const skill = chooseSkill(state);
  if (!skill) return { ...state, current: null, finished: true };
  const rng: Rng = createRng(`${state.seed}:${state.answers.length}`);
  const { mean } = skillEstimate(state, skill);
  // Aim a little above the estimate: most informative with a guessing floor.
  const target = mean + 0.35;
  const asked = new Set(state.askedItems);
  const pool = poolFor(skill, lib).filter((p) => !asked.has(`${p.item.id}|${p.format}`));
  if (!pool.length) {
    const config = { ...state.config, skills: state.config.skills.filter((s) => s !== skill) };
    return nextPlacementQuestion({ ...state, config }, lib, listening);
  }
  pool.sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
  const near = pool.slice(0, 4);
  let question: Question | null = null;
  for (let i = 0; i < near.length && !question; i++) {
    const choice = i === 0 ? pick(rng, near) : (near[i] as (typeof near)[number]);
    // A few typed kana questions check active recall when the learner seems to know kana.
    const typed = (skill === 'hiragana' || skill === 'katakana') && mean > 1 && askedIn(state, skill) % 3 === 2;
    const q = buildQuestion(choice.item, choice.format, typed ? 'typed' : 'choice', { library: lib, rng, listening, conjugationMaxDifficulty: Math.max(2.5, mean + 1) });
    if (q) question = { ...q, difficulty: choice.difficulty };
    if (q) asked.add(`${choice.item.id}|${choice.format}`);
  }
  if (!question) return { ...state, current: null, finished: true };
  return { ...state, askedItems: [...asked], current: { ...question, placementSkill: skill } };
}

function updatePosterior(post: number[], difficulty: number, correct: boolean, guess: number): number[] {
  return post.map((lp, i) => {
    const p = clamp(pCorrect(GRID[i] as number, difficulty, guess), 1e-4, 1 - 1e-4);
    return lp + Math.log(correct ? p : 1 - p);
  });
}

/**
 * Record an answer. `response === null` means "I don't know".
 * Kanji are separated from the skill being tested: revealing the reading, or
 * saying the kanji can't be read, counts as a miss for kanji only.
 */
export function answerPlacement(
  state: PlacementState,
  response: string | string[] | null,
  latencyMs?: number,
  meta: AnswerMeta = {},
): { state: PlacementState; correct: boolean } {
  const q = state.current;
  if (!q) throw new Error('No current placement question');
  const posteriors = { ...state.posteriors };
  const answers = [...state.answers];
  const kd = q.kanjiDifficulty;
  if (kd !== undefined && (meta.readingShown || meta.cantReadKanji) && posteriors.kanji && q.placementSkill !== 'kanji') {
    posteriors.kanji = updatePosterior(posteriors.kanji, kd, false, 0);
    answers.push({ questionId: `${q.id}#kanji`, itemId: q.itemId, skill: 'kanji', difficulty: kd, guess: 0, correct: false, dontKnow: false, derived: true });
  }
  if (meta.cantReadKanji) {
    answers.push({ questionId: q.id, itemId: q.itemId, skill: q.placementSkill, difficulty: q.difficulty, guess: 0, correct: false, dontKnow: true, kanjiBlocked: true, latencyMs });
    return { state: { ...state, posteriors, answers, current: null }, correct: false };
  }
  const dontKnow = response === null;
  const correct = dontKnow ? false : checkAnswer(q, response).correct;
  const guess = q.mode === 'choice' ? guessRate(q.choices?.length) : 0;
  const post = posteriors[q.placementSkill];
  if (!post) throw new Error(`No posterior for ${q.placementSkill}`);
  posteriors[q.placementSkill] = updatePosterior(post, q.difficulty, correct, guess);
  answers.push({ questionId: q.id, itemId: q.itemId, skill: q.placementSkill, difficulty: q.difficulty, guess, correct, dontKnow, latencyMs });
  return { state: { ...state, posteriors, answers, current: null }, correct };
}

export function placementProgress(state: PlacementState): { answered: number; estimatedTotal: number } {
  const answered = questionCount(state);
  const open = state.config.skills.filter((s) => !skillSettled(state, s)).length;
  const estimatedTotal = clamp(Math.max(state.config.minQuestions, answered + open * 2), answered, state.config.maxQuestions);
  return { answered, estimatedTotal };
}

/** Kana are a gate, not a level: their items top out near N5, so they are excluded from the overall estimate. */
const CATEGORY_WEIGHTS: Partial<Record<Skill, number>> = {
  vocabulary: 0.24, kanji: 0.16, grammar: 0.2, particles: 0.1, conjugation: 0.08, sentences: 0.06, reading: 0.06,
};

export function bandForAbility(ability: number): JlptBand | 'pre-N5' {
  if (ability < 1.0) return 'pre-N5';
  if (ability < 3.0) return 'N5';
  if (ability < 4.8) return 'N4';
  if (ability < 6.5) return 'N3';
  if (ability < 8.0) return 'N2';
  return 'N1';
}

export function finishPlacement(state: PlacementState, lib: ContentLibrary, now: number): PlacementResult {
  const categories: PlacementCategoryResult[] = state.config.skills.map((skill) => {
    const { mean, sd } = skillEstimate(state, skill);
    const all = state.answers.filter((a) => a.skill === skill);
    const ans = all.filter((a) => !a.kanjiBlocked);
    return {
      skill,
      ability: Math.round(mean * 100) / 100,
      uncertainty: Math.round(sd * 100) / 100,
      asked: ans.length,
      correct: ans.filter((a) => a.correct).length,
      score: Math.round(clamp(mean / 9, 0, 1) * 100),
      kanjiBlocked: all.length - ans.length || undefined,
    };
  });
  let sum = 0;
  let w = 0;
  let varSum = 0;
  for (const c of categories) {
    const weight = CATEGORY_WEIGHTS[c.skill] ?? 0;
    sum += c.ability * weight;
    varSum += (c.uncertainty * weight) ** 2;
    w += weight;
  }
  const overall = w ? sum / w : 0;
  const overallSd = w ? Math.sqrt(varSum) / w : 3;

  // Kana knowledge: what was answered, plus what lies clearly below/above the estimate.
  const known = new Set<string>();
  const unknown = new Set<string>();
  for (const a of state.answers) {
    const item = lib.byId.get(a.itemId);
    if (item?.type !== 'kana') continue;
    (a.correct ? known : unknown).add(item.ja);
  }
  for (const item of lib.items) {
    if (item.type !== 'kana' || known.has(item.ja) || unknown.has(item.ja)) continue;
    const est = categories.find((c) => c.skill === item.skills[0]);
    if (!est) continue;
    if (item.difficulty < est.ability - 0.8) known.add(item.ja);
    else if (item.difficulty > est.ability + 0.5) unknown.add(item.ja);
  }

  const core = categories.filter((c) => c.skill !== 'hiragana' && c.skill !== 'katakana' && c.asked > 0);
  const sorted = core.slice().sort((a, b) => b.ability - a.ability);
  // A strength needs real evidence, not one lucky multiple-choice guess.
  const strengths = sorted.filter((c) => c.ability >= overall + 0.4 && c.ability >= 1 && c.correct / c.asked >= 0.5).slice(0, 3).map((c) => c.skill);
  const weaknesses = sorted.slice().reverse().filter((c) => c.ability <= overall - 0.4).slice(0, 3).map((c) => c.skill);

  return {
    id: state.id,
    takenAt: now,
    experience: state.experience,
    skipped: false,
    overallAbility: Math.round(overall * 100) / 100,
    overallScore: Math.round(clamp(overall / 9, 0, 1) * 100),
    band: bandForAbility(overall),
    bandConfident: overallSd < 0.6 && questionCount(state) >= state.config.minQuestions,
    categories,
    knownKana: sortKana(known, lib),
    unknownKana: sortKana(unknown, lib),
    strengths,
    weaknesses,
    recommendedDifficulty: Math.round(clamp(overall, 0.2, 9) * 10) / 10,
    questionCount: questionCount(state),
    durationMs: now - state.startedAt,
    answers: state.answers.filter((a) => !a.derived && !a.kanjiBlocked).map((a) => ({ itemId: a.itemId, skill: a.skill, difficulty: a.difficulty, correct: a.correct })),
    hlc: '',
  };
}

function sortKana(set: Set<string>, lib: ContentLibrary): string[] {
  const order = (k: string) => lib.byId.get(`kana:${k}`)?.order ?? 9999;
  return [...set].sort((a, b) => order(a) - order(b));
}

/** Result for a learner who explicitly chooses to start from the beginning. */
export function beginnerPlacement(now: number, skills: Skill[] = DEFAULT_PLACEMENT.skills): PlacementResult {
  return {
    id: createId(now),
    takenAt: now,
    experience: 'none',
    skipped: true,
    overallAbility: 0.2,
    overallScore: 2,
    band: 'pre-N5',
    bandConfident: false,
    categories: skills.map((skill) => ({ skill, ability: 0.2, uncertainty: 1.5, asked: 0, correct: 0, score: 2 })),
    knownKana: [],
    unknownKana: [],
    strengths: [],
    weaknesses: [],
    recommendedDifficulty: 0.2,
    questionCount: 0,
    durationMs: 0,
    answers: [],
    hlc: '',
  };
}
