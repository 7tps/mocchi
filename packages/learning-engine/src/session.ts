import type { LearningItem, LearningProgress, Question, QuestionFormat, Skill, SkillProfile } from '@jc/shared-types';
import type { ContentLibrary } from '@jc/japanese-content';
import { DAY, HOUR, MINUTE, clamp, createRng, type Rng } from '@jc/shared-utils';
import { buildQuestion, chooseFormat, chooseMode, skillForFormat } from './questions';
import { isDue, retrievability } from './srs';
import { weakestSkills } from './proficiency';

export interface SelectionWeights {
  urgency: number;
  forgetting: number;
  recentMiss: number;
  importance: number;
  weakSkill: number;
  newFit: number;
  newImportance: number;
  /** Chance (0–1) to include one question from the weakest skill. */
  weakSkillChance: number;
  /** Chance a reviewing item is asked as a typed recall question. */
  typedRate: number;
}

export const DEFAULT_WEIGHTS: SelectionWeights = {
  urgency: 1.2,
  forgetting: 1.5,
  recentMiss: 1.0,
  importance: 0.4,
  weakSkill: 0.5,
  newFit: 1.0,
  newImportance: 0.6,
  weakSkillChance: 0.35,
  typedRate: 0.55,
};

export interface ComposeOptions {
  library: ContentLibrary;
  progress: ReadonlyMap<string, LearningProgress>;
  skills: SkillProfile;
  enabledSkills: Skill[];
  sessionLength: number;
  newItemsPerSession: number;
  now: number;
  seed: string | number;
  /** Items to avoid right now (just dismissed or just answered). */
  recentItemIds?: ReadonlySet<string>;
  listening?: boolean;
  weights?: Partial<SelectionWeights>;
  /** Restrict to review only (no new material). */
  reviewOnly?: boolean;
}

export type PlanKind = 'review' | 'missed' | 'new' | 'weak-skill' | 'practice';

export interface PlannedQuestion {
  question: Question;
  kind: PlanKind;
  reason: string;
}

function itemEnabled(item: LearningItem, enabled: ReadonlySet<Skill>): boolean {
  return item.skills.some((s) => enabled.has(s));
}

function humanAgo(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  return `${Math.round(ms / DAY)} day${Math.round(ms / DAY) === 1 ? '' : 's'}`;
}

/**
 * Whether the learner can read the script an item is presented in. Learners
 * who do not know hiragana yet only get kana (and romaji-supported expressions
 * are deferred) so we never quiz unreadable material.
 */
export function scriptReady(item: LearningItem, skills: SkillProfile): boolean {
  if (item.type === 'kana') {
    if (item.skills[0] === 'katakana') return skills.hiragana.ability >= 0.9;
    return true;
  }
  if (skills.hiragana.ability < 1.3) return false;
  if (item.tags.includes('loanword') && skills.katakana.ability < 1.6) return false;
  return true;
}

/** Items the learner has demonstrably outgrown are not introduced as "new". */
export function isAssumedKnown(item: LearningItem, skills: SkillProfile): boolean {
  const est = skills[item.skills[0] ?? 'vocabulary'];
  return item.difficulty < est.ability - 1.5 - est.uncertainty;
}

interface Candidate {
  item: LearningItem;
  score: number;
  kind: PlanKind;
  reason: string;
  progress?: LearningProgress;
}

export function reviewCandidates(opts: ComposeOptions, rng: Rng): Candidate[] {
  const w = { ...DEFAULT_WEIGHTS, ...opts.weights };
  const enabled = new Set(opts.enabledSkills);
  const weak = new Set(weakestSkills(opts.skills, opts.enabledSkills));
  const out: Candidate[] = [];
  for (const p of opts.progress.values()) {
    const item = opts.library.byId.get(p.itemId);
    if (!item || !itemEnabled(item, enabled) || opts.recentItemIds?.has(item.id)) continue;
    const due = isDue(p, opts.now);
    const recentlyMissed = p.lastWrongAt !== undefined && opts.now - p.lastWrongAt < 12 * HOUR;
    // Learning-step items may be pulled slightly early: short sessions are
    // infrequent, so waiting for the exact minute would delay them by hours.
    const earlyOk = (p.status === 'learning' || p.status === 'relearning') && p.nextReviewAt - opts.now < 45 * MINUTE;
    if (!due && !earlyOk) continue;
    const intervalMs = Math.max(MINUTE, p.nextReviewAt - p.lastReviewedAt);
    const overdue = clamp((opts.now - p.nextReviewAt) / intervalMs, 0, 3);
    const forget = 1 - retrievability(p, opts.now);
    const score =
      w.urgency * overdue +
      w.forgetting * forget +
      (recentlyMissed ? w.recentMiss : 0) +
      w.importance * item.importance +
      (item.skills.some((s) => weak.has(s)) ? w.weakSkill : 0) +
      rng() * 0.3;
    const since = humanAgo(opts.now - p.lastReviewedAt);
    const reason = recentlyMissed
      ? `You missed this ${since} ago — let's try it again.`
      : `Due for review — last seen ${since} ago.`;
    out.push({ item, score, kind: recentlyMissed ? 'missed' : 'review', reason, progress: p });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function newCandidates(opts: ComposeOptions, rng: Rng, onlySkill?: Skill): Candidate[] {
  const w = { ...DEFAULT_WEIGHTS, ...opts.weights };
  const enabled = new Set(onlySkill ? [onlySkill] : opts.enabledSkills);
  const out: Candidate[] = [];
  for (const item of opts.library.items) {
    if (opts.progress.has(item.id) || !itemEnabled(item, enabled) || opts.recentItemIds?.has(item.id)) continue;
    if (!scriptReady(item, opts.skills) || isAssumedKnown(item, opts.skills)) continue;
    const est = opts.skills[item.skills[0] ?? 'vocabulary'];
    // Manageable new material: near or slightly above the current ability.
    if (item.difficulty > est.ability + 1.4) continue;
    const target = est.ability + 0.3;
    const fit = -Math.abs(item.difficulty - target);
    const score = w.newFit * fit + w.newImportance * item.importance - item.order * 0.0005 + rng() * 0.25;
    out.push({ item, score, kind: 'new', reason: `New ${labelFor(item)} at your level.` });
  }
  return out.sort((a, b) => b.score - a.score);
}

function labelFor(item: LearningItem): string {
  switch (item.type) {
    case 'kana': return item.skills[0] === 'katakana' ? 'katakana' : 'hiragana';
    case 'vocab': return 'word';
    case 'kanji': return 'kanji';
    case 'grammar': return 'grammar pattern';
    case 'particle': return 'particle';
    case 'conjugation': return 'conjugation form';
    case 'expression': return 'expression';
    case 'reading': return 'reading passage';
  }
}

/**
 * Compose a short session (2–5 questions): mostly due reviews, recently
 * missed items, a little new material, and occasionally the weakest skill.
 * Deterministic for a given seed.
 */
export function composeSession(opts: ComposeOptions): PlannedQuestion[] {
  const rng = createRng(opts.seed);
  const w = { ...DEFAULT_WEIGHTS, ...opts.weights };
  const length = clamp(Math.round(opts.sessionLength), 1, 10);
  const reviews = reviewCandidates(opts, rng);
  const picked: Candidate[] = [];
  const used = new Set<string>();
  const skillCount = new Map<Skill, number>();
  const take = (c: Candidate) => {
    picked.push(c);
    used.add(c.item.id);
    const s = c.item.skills[0] ?? 'vocabulary';
    skillCount.set(s, (skillCount.get(s) ?? 0) + 1);
  };
  const tooMany = (c: Candidate) => (skillCount.get(c.item.skills[0] ?? 'vocabulary') ?? 0) >= Math.max(2, Math.ceil(length * 0.6));

  // 1. Reviews first, keeping skills varied.
  for (const c of reviews) {
    if (picked.length >= length) break;
    if (!tooMany(c)) take(c);
  }
  for (const c of reviews) {
    if (picked.length >= length) break;
    if (!used.has(c.item.id)) take(c);
  }

  // 2. New material: fill free slots, and keep a trickle flowing when the backlog is small.
  if (!opts.reviewOnly && opts.newItemsPerSession > 0) {
    const fresh = newCandidates(opts, rng);
    // With no reviews yet (a brand-new learner), allow one extra new item so sessions are not tiny.
    const quota = reviews.length === 0 ? opts.newItemsPerSession + 1 : opts.newItemsPerSession;
    let slots = clamp(length - picked.length, 0, quota);
    if (slots === 0 && reviews.length <= length * 2 && fresh.length) {
      picked.pop();
      slots = 1;
    }
    for (const c of fresh) {
      if (slots <= 0) break;
      if (used.has(c.item.id) || tooMany(c)) continue;
      take(c);
      slots--;
    }
  }

  // 3. Occasionally swap in the weakest skill.
  if (!opts.reviewOnly && picked.length > 1 && rng() < w.weakSkillChance) {
    const [weak] = weakestSkills(opts.skills, opts.enabledSkills, 1);
    if (weak && !picked.some((c) => c.item.skills.includes(weak))) {
      const pool = [...reviews.filter((c) => c.item.skills.includes(weak) && !used.has(c.item.id)), ...newCandidates(opts, rng, weak)];
      const c = pool.find((x) => !used.has(x.item.id));
      if (c) {
        picked.splice(picked.length - 1, 1, {
          ...c,
          kind: 'weak-skill',
          reason: `Extra practice for ${weak} — one of your weaker areas.`,
        });
      }
    }
  }

  // 4. Nothing due and nothing new: practice the items closest to being due.
  if (picked.length < Math.min(2, length)) {
    const upcoming = [...opts.progress.values()]
      .filter((p) => !used.has(p.itemId) && opts.library.byId.has(p.itemId) && !opts.recentItemIds?.has(p.itemId))
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
    for (const p of upcoming) {
      if (picked.length >= Math.min(2, length)) break;
      const item = opts.library.byId.get(p.itemId);
      if (!item || !itemEnabled(item, new Set(opts.enabledSkills))) continue;
      take({ item, score: 0, kind: 'practice', reason: 'Extra practice — nothing is due right now.', progress: p });
    }
  }

  // Build questions with format variety.
  const out: PlannedQuestion[] = [];
  let lastFormat: QuestionFormat | undefined;
  const avoidExercise = new Set<string>();
  const ctxBase = {
    library: opts.library,
    rng,
    listening: opts.listening,
    conjugationMaxDifficulty: Math.max(2.5, opts.skills.vocabulary.ability + 0.5),
    avoidExerciseIds: avoidExercise,
  };
  for (const c of orderForVariety(picked)) {
    const status = c.progress?.status ?? 'new';
    let q: Question | null = null;
    for (let attempt = 0; attempt < 3 && !q; attempt++) {
      const format = chooseFormat(c.item, status, ctxBase, lastFormat);
      if (!format) break;
      if (format === 'listening' && status === 'new') continue;
      const mode = chooseMode(format, status, rng, w.typedRate);
      q = buildQuestion(c.item, format, mode, ctxBase);
    }
    if (!q) continue;
    lastFormat = q.format;
    avoidExercise.add(q.id.split('|')[2] ?? '');
    out.push({ question: { ...q, reason: c.reason, skill: skillForFormat(c.item, q.format) }, kind: c.kind, reason: c.reason });
  }
  return out;
}

/** Interleave skills so the same skill is not asked twice in a row when avoidable. */
function orderForVariety(list: Candidate[]): Candidate[] {
  const rest = list.slice();
  const out: Candidate[] = [];
  while (rest.length) {
    const prev = out[out.length - 1]?.item.skills[0];
    const idx = rest.findIndex((c) => c.item.skills[0] !== prev);
    out.push(...rest.splice(idx === -1 ? 0 : idx, 1));
  }
  return out;
}

/** Number of reviews due now (used by schedulers to decide whether to prompt). */
export function countDue(progress: ReadonlyMap<string, LearningProgress> | Iterable<LearningProgress>, now: number): number {
  let n = 0;
  const values = progress instanceof Map ? progress.values() : (progress as Iterable<LearningProgress>);
  for (const p of values) if (isDue(p, now)) n++;
  return n;
}

/** Due-time list for forecasting notifications. */
export function dueTimes(progress: Iterable<LearningProgress>): number[] {
  const out: number[] = [];
  for (const p of progress) if (p.status !== 'new') out.push(p.nextReviewAt);
  return out.sort((a, b) => a - b);
}
