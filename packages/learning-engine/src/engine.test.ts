import { describe, expect, it } from 'vitest';
import type { LearningProgress, PauseState, Question, QuizAttempt, SkillProfile } from '@jc/shared-types';
import { getLibrary } from '@jc/japanese-content';
import { DAY, HOUR, MINUTE, createRng, localTimeToTs } from '@jc/shared-utils';
import {
  applyReview,
  newProgress,
  retrievability,
  checkAnswer,
  buildQuestion,
  composeSession,
  emptyProfile,
  updateSkill,
  startPlacement,
  nextPlacementQuestion,
  answerPlacement,
  finishPlacement,
  pCorrect,
  profileFromPlacement,
  decideDesktopPrompt,
  planMobileNotifications,
  inQuietHours,
  xpForSession,
  levelForXp,
  computeStreak,
  updateCharacter,
  emptyCharacter,
  replayAttempts,
  type DesktopSchedulerInput,
  type PlacementState,
} from './index';

const lib = getLibrary();
const T0 = Date.UTC(2026, 9, 26, 3, 0); // 12:00 in Tokyo

describe('spaced repetition', () => {
  it('moves a new item through learning steps and graduates it', () => {
    let p = newProgress('v:猫', T0);
    p = applyReview(p, { correct: true, now: T0, latencyMs: 6000 });
    expect(p.status).toBe('learning');
    expect(p.nextReviewAt - T0).toBe(240 * MINUTE);
    p = applyReview(p, { correct: true, now: p.nextReviewAt, latencyMs: 6000 });
    expect(p.status).toBe('reviewing');
    expect(p.intervalDays).toBe(1);
  });

  it('schedules longer intervals after repeated correct answers', () => {
    let p: LearningProgress = { ...newProgress('v:猫', T0), status: 'reviewing', intervalDays: 1, nextReviewAt: T0, lastReviewedAt: T0 - DAY };
    const intervals: number[] = [];
    let now = T0;
    for (let i = 0; i < 5; i++) {
      p = applyReview(p, { correct: true, now, latencyMs: 5000 });
      intervals.push(p.intervalDays);
      now = p.nextReviewAt;
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1] as number);
    expect(p.status).toBe('retained');
  });

  it('brings an incorrect answer back much sooner', () => {
    let p: LearningProgress = { ...newProgress('v:猫', T0), status: 'reviewing', intervalDays: 10, nextReviewAt: T0, lastReviewedAt: T0 - 10 * DAY };
    p = applyReview(p, { correct: false, now: T0 });
    expect(p.status).toBe('relearning');
    expect(p.nextReviewAt - T0).toBeLessThanOrEqual(10 * MINUTE);
    expect(p.lapses).toBe(1);
    expect(p.ease).toBeLessThan(2.5);
    p = applyReview(p, { correct: true, now: p.nextReviewAt });
    expect(p.status).toBe('reviewing');
    expect(p.intervalDays).toBeLessThan(10);
  });

  it('never schedules into the past when the clock moves backwards', () => {
    let p = applyReview(newProgress('v:猫', T0), { correct: true, now: T0 });
    p = applyReview(p, { correct: true, now: T0 - 5 * HOUR });
    expect(p.nextReviewAt).toBeGreaterThan(T0 - 5 * HOUR);
  });

  it('decays retrievability over time', () => {
    const p: LearningProgress = { ...newProgress('x', T0), status: 'reviewing', intervalDays: 2, lastReviewedAt: T0, nextReviewAt: T0 + 2 * DAY };
    expect(retrievability(p, T0 + 2 * DAY)).toBeCloseTo(0.9, 2);
    expect(retrievability(p, T0 + 6 * DAY)).toBeLessThan(retrievability(p, T0 + 3 * DAY));
  });
});

describe('answer validation', () => {
  const q = (over: Partial<Question>): Question => ({
    id: 'q', itemId: 'v:猫', format: 'ja-to-en', mode: 'typed', skill: 'vocabulary', difficulty: 1, instruction: '', prompt: '',
    answer: 'cat', accepted: ['cat'], answerScript: 'english', explanation: '', ...over,
  });

  it('accepts listed English meanings, ignoring case, articles and whitespace', () => {
    const qq = q({ answer: 'go', accepted: ['go', 'to go'] });
    expect(checkAnswer(qq, '  To Go ').correct).toBe(true);
    expect(checkAnswer(q({}), 'a cat').correct).toBe(true);
  });

  it('does not accept substrings or short-word typos', () => {
    expect(checkAnswer(q({}), 'cats and dogs').correct).toBe(false);
    expect(checkAnswer(q({}), 'car').correct).toBe(false);
    expect(checkAnswer(q({}), 'ca').correct).toBe(false);
  });

  it('tolerates one typo on longer words and says so', () => {
    const r = checkAnswer(q({ answer: 'telephone', accepted: ['telephone'] }), 'telephon');
    expect(r.correct).toBe(true);
    expect(r.note).toMatch(/typo/i);
  });

  it('accepts kana, romaji and kanji for Japanese answers but not other words', () => {
    const jq = q({ format: 'en-to-ja', answer: '食べる', accepted: ['食べる', 'たべる'], answerScript: 'japanese' });
    expect(checkAnswer(jq, '食べる').correct).toBe(true);
    expect(checkAnswer(jq, 'たべる').correct).toBe(true);
    expect(checkAnswer(jq, 'taberu').correct).toBe(true);
    expect(checkAnswer(jq, 'のむ').correct).toBe(false);
    expect(checkAnswer(jq, '食べ').correct).toBe(false);
    expect(checkAnswer(jq, '').correct).toBe(false);
  });

  it('normalizes full-width input and notes script differences', () => {
    const kq = q({ format: 'word-to-reading', answer: 'でんしゃ', accepted: ['でんしゃ'], answerScript: 'kana' });
    const r = checkAnswer(kq, 'デンシャ');
    expect(r.correct).toBe(true);
    expect(r.note).toMatch(/hiragana/);
    expect(checkAnswer(kq, ' でんしゃ　').correct).toBe(true);
  });

  it('accepts alternate romanizations for kana', () => {
    const rq = q({ format: 'kana-to-romaji', answer: 'shi', accepted: ['shi', 'si'], answerScript: 'romaji' });
    expect(checkAnswer(rq, 'SI').correct).toBe(true);
    expect(checkAnswer(rq, 'su').correct).toBe(false);
  });

  it('checks arranged sentences token by token', () => {
    const aq = q({ format: 'arrange', mode: 'arrange', answer: 'これは本です', accepted: ['これは本です'], answerScript: 'japanese' });
    expect(checkAnswer(aq, ['これは', '本', 'です']).correct).toBe(true);
    expect(checkAnswer(aq, ['本', 'これは', 'です']).correct).toBe(false);
  });
});

describe('question generation', () => {
  it('never offers a distractor that shares a meaning with the answer', () => {
    const rng = createRng(1);
    for (const item of lib.items.filter((i) => i.type === 'vocab').slice(0, 200)) {
      const qn = buildQuestion(item, 'ja-to-en', 'choice', { library: lib, rng });
      if (!qn) continue;
      const wrong = (qn.choices ?? []).filter((c) => c !== qn.answer);
      for (const w of wrong) expect(item.meanings.map((m) => m.toLowerCase())).not.toContain(w.toLowerCase());
      expect(qn.choices).toContain(qn.answer);
    }
  });

  it('builds every format for every item without throwing', () => {
    const rng = createRng(2);
    for (const item of lib.items) {
      for (const mode of ['choice', 'typed'] as const) {
        const formats = item.type === 'kana' ? (['kana-to-romaji', 'romaji-to-kana'] as const) : undefined;
        for (const f of formats ?? []) buildQuestion(item, f, mode, { library: lib, rng, listening: true });
      }
    }
  });

  it('produces conjugation questions whose answer is accepted', () => {
    const rng = createRng(3);
    const item = lib.byId.get('c:te');
    expect(item).toBeDefined();
    for (let i = 0; i < 20; i++) {
      const qn = buildQuestion(item!, 'conjugate', 'typed', { library: lib, rng });
      expect(qn).not.toBeNull();
      expect(checkAnswer(qn!, qn!.answer).correct).toBe(true);
    }
  });
});

describe('skill estimates', () => {
  it('moves up after correct hard answers and down after easy misses', () => {
    const est = emptyProfile(T0).grammar;
    expect(updateSkill(est, 4, true, 0, T0).ability).toBeGreaterThan(est.ability);
    const strong = { ...est, ability: 5 };
    expect(updateSkill(strong, 2, false, 0, T0).ability).toBeLessThan(5);
  });

  it('keeps skills independent', () => {
    let profile: SkillProfile = emptyProfile(T0);
    for (let i = 0; i < 10; i++) profile = { ...profile, hiragana: updateSkill(profile.hiragana, 1.5, true, 0, T0) };
    expect(profile.hiragana.ability).toBeGreaterThan(1);
    expect(profile.particles.ability).toBe(emptyProfile(T0).particles.ability);
  });
});

/** Simulated learner: answers correctly with the model's probability. */
function simulate(trueAbility: Record<string, number>, experience: 'none' | 'intermediate', seed: string) {
  const rng = createRng(seed);
  let s: PlacementState = startPlacement(experience, T0, seed);
  for (let i = 0; i < 60; i++) {
    s = nextPlacementQuestion(s, lib);
    if (s.finished || !s.current) break;
    const q = s.current;
    const ability = trueAbility[q.placementSkill] ?? trueAbility.default ?? 0;
    const knows = rng() < pCorrect(ability, q.difficulty);
    let response: string | null = null;
    if (knows) response = q.answer;
    else if (q.choices && ability > 1) response = q.choices.find((c) => c !== q.answer) ?? null;
    s = answerPlacement(s, response, 5000).state;
  }
  return { state: s, result: finishPlacement(s, lib, T0 + 8 * MINUTE) };
}

describe('placement exam', () => {
  it('places a complete beginner before N5 and does not assume kana', () => {
    const { result } = simulate({ default: -0.5 }, 'none', 'beginner');
    expect(result.questionCount).toBeGreaterThanOrEqual(20);
    expect(result.questionCount).toBeLessThanOrEqual(40);
    expect(result.band).toBe('pre-N5');
    expect(result.unknownKana.length).toBeGreaterThan(result.knownKana.length);
    expect(result.recommendedDifficulty).toBeLessThan(1.5);
  });

  it('gives an intermediate learner harder questions and a higher band', () => {
    const { state, result } = simulate({ hiragana: 4, katakana: 3.5, default: 4.6 }, 'intermediate', 'inter');
    const vocabDifficulties = state.answers.filter((a) => a.skill === 'vocabulary').map((a) => a.difficulty);
    expect(Math.max(...vocabDifficulties)).toBeGreaterThan(3);
    expect(['N4', 'N3']).toContain(result.band);
    expect(result.overallAbility).toBeGreaterThan(3);
  });

  it('measures skills independently (kanji does not imply grammar)', () => {
    const { result } = simulate({ hiragana: 4, katakana: 4, kanji: 6, vocabulary: 4, grammar: 1, particles: 1, default: 2 }, 'intermediate', 'kanji-heavy');
    const kanji = result.categories.find((c) => c.skill === 'kanji')!;
    const grammar = result.categories.find((c) => c.skill === 'grammar')!;
    expect(kanji.ability - grammar.ability).toBeGreaterThan(1.5);
    expect(result.weaknesses).toContain('grammar');
  });

  it('weighs difficulty, not just the number correct', () => {
    // Same number correct, but one learner answered harder items.
    const base = startPlacement('beginner', T0, 'w');
    const mk = (difficulty: number) => {
      let s: PlacementState = { ...base, current: { ...(nextPlacementQuestion(base, lib).current as NonNullable<PlacementState['current']>), placementSkill: 'vocabulary' as const, difficulty } };
      s = answerPlacement(s, s.current!.answer).state;
      return finishPlacement(s, lib, T0).categories.find((c) => c.skill === 'vocabulary')!.ability;
    };
    expect(mk(5)).toBeGreaterThan(mk(1));
  });

  it('seeds the skill profile from the result', () => {
    const { result } = simulate({ hiragana: 4, katakana: 3.5, default: 4.6 }, 'intermediate', 'seed');
    const profile = profileFromPlacement(result, T0);
    expect(profile.vocabulary.ability).toBeCloseTo(result.categories.find((c) => c.skill === 'vocabulary')!.ability, 5);
  });
});

describe('session composition', () => {
  const skills = (ability: number): SkillProfile => {
    const p = emptyProfile(T0);
    for (const k of Object.keys(p) as Array<keyof SkillProfile>) p[k] = { ...p[k], ability, uncertainty: 0.6 };
    return p;
  };
  const enabled = ['hiragana', 'katakana', 'vocabulary', 'kanji', 'grammar', 'particles', 'conjugation', 'expressions', 'reading', 'sentences'] as const;

  it('gives a beginner only hiragana', () => {
    const plan = composeSession({ library: lib, progress: new Map(), skills: skills(0.2), enabledSkills: [...enabled], sessionLength: 4, newItemsPerSession: 3, now: T0, seed: 'b' });
    expect(plan.length).toBeGreaterThan(0);
    for (const p of plan) expect(p.question.skill).toBe('hiragana');
  });

  it('prioritises due reviews and introduces at most the configured new items', () => {
    const progress = new Map<string, LearningProgress>();
    for (const id of ['v:猫', 'v:犬', 'v:水']) {
      progress.set(id, { ...newProgress(id, T0 - 3 * DAY), status: 'reviewing', intervalDays: 1, lastReviewedAt: T0 - 2 * DAY, nextReviewAt: T0 - DAY, attempts: 2 });
    }
    const plan = composeSession({ library: lib, progress, skills: skills(2.5), enabledSkills: [...enabled], sessionLength: 4, newItemsPerSession: 1, now: T0, seed: 'r', weights: { weakSkillChance: 0 } });
    expect(plan.filter((p) => p.kind === 'review').length).toBe(3);
    expect(plan.filter((p) => p.kind === 'new').length).toBeLessThanOrEqual(1);
    for (const p of plan) expect(p.reason.length).toBeGreaterThan(0);
  });

  it('returns a missed item soon after an incorrect answer', () => {
    let p = applyReview(newProgress('v:猫', T0), { correct: true, now: T0 });
    p = applyReview(p, { correct: false, now: T0 + MINUTE });
    const later = T0 + 15 * MINUTE;
    const plan = composeSession({ library: lib, progress: new Map([[p.itemId, p]]), skills: skills(2.5), enabledSkills: [...enabled], sessionLength: 3, newItemsPerSession: 1, now: later, seed: 'm' });
    const missed = plan.find((x) => x.question.itemId === 'v:猫');
    expect(missed?.kind).toBe('missed');
  });

  it('skips items the learner was just shown', () => {
    const plan = composeSession({ library: lib, progress: new Map(), skills: skills(0.2), enabledSkills: ['hiragana'], sessionLength: 5, newItemsPerSession: 5, now: T0, seed: 'x', recentItemIds: new Set(['kana:あ', 'kana:い']) });
    expect(plan.map((p) => p.question.itemId)).not.toContain('kana:あ');
  });

  it('is deterministic for a seed', () => {
    const opts = { library: lib, progress: new Map(), skills: skills(3), enabledSkills: [...enabled], sessionLength: 4, newItemsPerSession: 2, now: T0, seed: 'same' };
    expect(composeSession(opts).map((p) => p.question.id)).toEqual(composeSession(opts).map((p) => p.question.id));
  });
});

describe('desktop scheduler', () => {
  const base: DesktopSchedulerInput = {
    now: T0,
    timeZone: 'Asia/Tokyo',
    settings: { quietHours: { enabled: true, start: 22 * 60, end: 8 * 60 }, dailyGoalQuestions: 20, maxDailyInterruptions: 8, minMinutesBetweenInterruptions: 20, popupIntervalMinMinutes: 30, popupIntervalMaxMinutes: 60 },
    pause: { until: null, indefinite: false },
    snoozeUntil: null,
    appStartedAt: T0 - 2 * HOUR,
    lastPromptAt: T0 - HOUR,
    promptsToday: 1,
    questionsToday: 3,
    dueCount: 4,
    newAvailable: true,
    activeMinutes: 45,
    targetActiveMinutes: 40,
    idle: false,
  };

  it('shows a prompt with an explicit reason when eligible', () => {
    const d = decideDesktopPrompt(base);
    expect(d.show).toBe(true);
    expect(d.reason).toMatch(/4 reviews due/);
  });

  it.each<[string, Partial<DesktopSchedulerInput>]>([
    ['paused', { pause: { until: T0 + HOUR, indefinite: false } }],
    ['paused indefinitely', { pause: { until: null, indefinite: true } }],
    ['snoozed', { snoozeUntil: T0 + 10 * MINUTE }],
    ['goal reached', { questionsToday: 20 }],
    ['interruption cap', { promptsToday: 8 }],
    ['just launched', { appStartedAt: T0 - MINUTE }],
    ['too soon', { lastPromptAt: T0 - 5 * MINUTE }],
    ['nothing to do', { dueCount: 0, newAvailable: false }],
    ['not active long enough', { activeMinutes: 10 }],
    ['user idle', { idle: true }],
  ])('does not interrupt when %s', (_name, over) => {
    const d = decideDesktopPrompt({ ...base, ...over });
    expect(d.show).toBe(false);
    expect(d.nextCheckAt).toBeGreaterThanOrEqual(T0);
  });

  it('respects quiet hours across midnight in the user timezone', () => {
    const lateTokyo = localTimeToTs('2026-10-26', 23 * 60, 'Asia/Tokyo');
    const d = decideDesktopPrompt({ ...base, now: lateTokyo });
    expect(d.show).toBe(false);
    expect(d.nextCheckAt).toBe(localTimeToTs('2026-10-27', 8 * 60, 'Asia/Tokyo'));
    expect(inQuietHours(base.settings.quietHours, localTimeToTs('2026-10-27', 7 * 60 + 59, 'Asia/Tokyo'), 'Asia/Tokyo')).toBe(true);
    expect(inQuietHours(base.settings.quietHours, localTimeToTs('2026-10-27', 8 * 60, 'Asia/Tokyo'), 'Asia/Tokyo')).toBe(false);
  });
});

describe('mobile notification planning', () => {
  const pause: PauseState = { until: null, indefinite: false };
  const settings = {
    quietHours: { enabled: true, start: 22 * 60, end: 8 * 60 },
    reminderTimes: [9 * 60, 13 * 60, 23 * 60],
    mobileRemindersPerDay: 3,
    notificationsEnabled: true,
    notificationCategories: { reviews: true, streak: true, milestones: true },
    dailyGoalQuestions: 20,
  };
  const dueTimes = [T0 + HOUR, T0 + 2 * DAY];

  it('plans reminders outside quiet hours, with no duplicates', () => {
    const plan = planMobileNotifications({ now: T0, timeZone: 'Asia/Tokyo', settings, pause, dueTimes, newAvailable: false, studiedToday: false, questionsToday: 0, streakDays: 2 });
    expect(plan.length).toBeGreaterThan(0);
    expect(new Set(plan.map((p) => p.at)).size).toBe(plan.length);
    for (const p of plan) expect(inQuietHours(settings.quietHours, p.at, 'Asia/Tokyo')).toBe(false);
    for (const p of plan) expect(p.at).toBeGreaterThan(T0);
  });

  it('does not remind when there is nothing useful and streak reminders are off', () => {
    const plan = planMobileNotifications({ now: T0, timeZone: 'Asia/Tokyo', settings: { ...settings, notificationCategories: { reviews: true, streak: false, milestones: false } }, pause, dueTimes: [], newAvailable: false, studiedToday: true, questionsToday: 5, streakDays: 0 });
    expect(plan).toEqual([]);
  });

  it('schedules nothing while paused or disabled', () => {
    expect(planMobileNotifications({ now: T0, timeZone: 'UTC', settings: { ...settings, notificationsEnabled: false }, pause, dueTimes, newAvailable: true, studiedToday: false, questionsToday: 0, streakDays: 0 })).toEqual([]);
    const paused = planMobileNotifications({ now: T0, timeZone: 'UTC', settings, pause: { until: T0 + 3 * DAY, indefinite: false }, dueTimes, newAvailable: true, studiedToday: false, questionsToday: 0, streakDays: 0 });
    for (const p of paused) expect(p.at).toBeGreaterThanOrEqual(T0 + 3 * DAY);
  });

  it('respects the OS pending-notification cap', () => {
    const plan = planMobileNotifications({ now: T0, timeZone: 'UTC', settings: { ...settings, quietHours: { enabled: false, start: 0, end: 0 } }, pause, dueTimes: [T0], newAvailable: true, studiedToday: false, questionsToday: 0, streakDays: 0, days: 30, maxNotifications: 10 });
    expect(plan.length).toBe(10);
  });
});

describe('timezones and day boundaries', () => {
  it('computes streaks from local dates', () => {
    expect(computeStreak(['2026-10-24', '2026-10-25', '2026-10-26'], '2026-10-26')).toBe(3);
    expect(computeStreak(['2026-10-24', '2026-10-25'], '2026-10-26')).toBe(2);
    expect(computeStreak(['2026-10-23'], '2026-10-26')).toBe(0);
  });

  it('keeps review schedules intact when the user changes timezone', () => {
    const p = applyReview(newProgress('v:猫', T0), { correct: true, now: T0 });
    // Schedules are absolute instants, so a timezone change does not move them.
    expect(p.nextReviewAt).toBe(T0 + 240 * MINUTE);
  });
});

describe('character progression', () => {
  it('rewards consistency and caps grinding', () => {
    const first = xpForSession({ correct: 3, answered: 4, firstSessionToday: true, xpEarnedToday: 0, streakDays: 3, goalJustReached: false });
    const grind = xpForSession({ correct: 3, answered: 4, firstSessionToday: false, xpEarnedToday: 500, streakDays: 3, goalJustReached: false });
    expect(first).toBeGreaterThan(grind * 2);
    expect(grind).toBeGreaterThan(0);
  });

  it('levels up and unlocks cosmetics without ever removing them', () => {
    const up = updateCharacter(emptyCharacter(), { xp: 300, streakDays: 3, sessionsCompleted: 10, goalReachedEver: true, introduced: 60, retained: 0 });
    expect(up.leveledUp).toBe(true);
    expect(levelForXp(300)).toBe(up.character.level);
    expect(up.character.unlocked).toContain('hachimaki');
    const later = updateCharacter(up.character, { xp: 300, streakDays: 0, sessionsCompleted: 10, goalReachedEver: true, introduced: 60, retained: 0 });
    expect(later.character.unlocked).toContain('hachimaki');
  });
});

describe('replay', () => {
  const attempt = (id: string, itemId: string, correct: boolean, at: number): QuizAttempt => ({
    id, sessionId: 's', itemId, format: 'ja-to-en', mode: 'choice', skill: 'vocabulary', difficulty: 1.5, response: 'x', correct, answeredAt: at, deviceId: 'd', hlc: `${at}`.padStart(15, '0') + ':00000:d',
  });

  it('is idempotent and order-independent', () => {
    const a = [attempt('1', 'v:猫', true, T0), attempt('2', 'v:猫', true, T0 + 5 * HOUR), attempt('3', 'v:犬', false, T0 + HOUR)];
    const one = replayAttempts(a, [], lib, T0);
    const two = replayAttempts([...a].reverse().concat(a), [], lib, T0);
    expect(two.progress.get('v:猫')).toEqual(one.progress.get('v:猫'));
    expect(two.skills.vocabulary.ability).toBe(one.skills.vocabulary.ability);
  });
});

describe('wrong-answer explanations', () => {
  it('says what a picked vocabulary distractor actually means', async () => {
    const { explainWrong } = await import('./answers');
    const item = lib.byId.get('v:猫')!;
    const q = buildQuestion(item, 'ja-to-en', 'choice', { library: lib, rng: createRng(5) })!;
    const wrong = q.choices!.find((c) => c !== q.answer)!;
    const why = explainWrong(q, wrong, checkAnswer(q, wrong));
    expect(why).toContain(`“${wrong}”`);
    expect(why).toMatch(/is .+/);
  });

  it('points out look-alike kana', async () => {
    const { explainWrong } = await import('./answers');
    const q = buildQuestion(lib.byId.get('kana:ぬ')!, 'kana-to-romaji', 'choice', { library: lib, rng: createRng(1) })!;
    const why = explainWrong(q, 'me', checkAnswer(q, 'me'));
    expect(why).toMatch(/め.*looks a lot like ぬ/);
  });

  it('names the conjugation rule a typed mistake broke, in kanji or kana', async () => {
    const { explainWrong } = await import('./answers');
    const rng = createRng(9);
    let q: Question | null = null;
    for (let i = 0; i < 200 && (!q || !q.prompt.endsWith('む')); i++) q = buildQuestion(lib.byId.get('c:te')!, 'conjugate', 'typed', { library: lib, rng, conjugationMaxDifficulty: 3 });
    expect(q?.prompt.endsWith('む')).toBe(true);
    const stem = q!.prompt.slice(0, -1);
    const kanjiMistake = `${stem}みて`;
    expect(explainWrong(q!, kanjiMistake, checkAnswer(q!, kanjiMistake))).toMatch(/ます-stem/);
    const readingStem = (q!.promptReading ?? q!.prompt).slice(0, -1);
    const kanaMistake = `${readingStem}みて`;
    expect(explainWrong(q!, kanaMistake, checkAnswer(q!, kanaMistake))).toMatch(/ます-stem/);
  });

  it('explains particle mistakes by what the wrong particle does', async () => {
    const { explainWrong } = await import('./answers');
    const q = buildQuestion(lib.byId.get('p:wo')!, 'fill-particle', 'choice', { library: lib, rng: createRng(2) })!;
    const wrong = q.choices!.find((c) => c !== q.answer)!;
    expect(explainWrong(q, wrong, checkAnswer(q, wrong))).toMatch(new RegExp(`^${wrong}`));
  });

  it('gives nothing for a correct answer', async () => {
    const { explainWrong } = await import('./answers');
    const q = buildQuestion(lib.byId.get('v:猫')!, 'ja-to-en', 'choice', { library: lib, rng: createRng(5) })!;
    expect(explainWrong(q, q.answer, checkAnswer(q, q.answer))).toBeUndefined();
  });
});

describe('kanji are measured separately', () => {
  it('marks kanji-dependent questions with the hardest kanji involved', async () => {
    const { kanjiLoad } = await import('./questions');
    expect(kanjiLoad('毎朝コーヒーを飲みます', lib)).toBe(Math.max(lib.byId.get('k:毎')!.difficulty, lib.byId.get('k:朝')!.difficulty, lib.byId.get('k:飲')!.difficulty));
    expect(buildQuestion(lib.byId.get('kana:あ')!, 'kana-to-romaji', 'choice', { library: lib, rng: createRng(1) })!.kanjiDifficulty).toBeUndefined();
    expect(buildQuestion(lib.byId.get('r:morning')!, 'comprehension', 'choice', { library: lib, rng: createRng(1) })!.kanjiDifficulty).toBeGreaterThan(0);
  });

  function readingQuestion(): PlacementState {
    const s = startPlacement('beginner', T0, 'kanji-split');
    const q = buildQuestion(lib.byId.get('r:morning')!, 'comprehension', 'choice', { library: lib, rng: createRng(1) })!;
    return { ...s, current: { ...q, placementSkill: 'reading' } };
  }

  it('"I can\'t read the kanji" lowers kanji, not reading', () => {
    const s = readingQuestion();
    const after = answerPlacement(s, null, undefined, { cantReadKanji: true }).state;
    const est = (st: PlacementState, k: 'reading' | 'kanji') => finishPlacement(st, lib, T0).categories.find((c) => c.skill === k)!.ability;
    expect(est(after, 'reading')).toBeCloseTo(est(s, 'reading'), 5);
    expect(est(after, 'kanji')).toBeLessThan(est(s, 'kanji'));
    expect(finishPlacement(after, lib, T0).categories.find((c) => c.skill === 'reading')!.kanjiBlocked).toBe(1);
  });

  it('a plain "I don\'t know" still counts against the tested skill', () => {
    const s = readingQuestion();
    const after = answerPlacement(s, null).state;
    const r = (st: PlacementState) => finishPlacement(st, lib, T0).categories.find((c) => c.skill === 'reading')!.ability;
    expect(r(after)).toBeLessThan(r(s));
  });

  it('showing the reading counts against kanji while the answer still counts for reading', () => {
    const s = readingQuestion();
    const after = answerPlacement(s, s.current!.answer, 4000, { readingShown: true }).state;
    const cat = (st: PlacementState, k: string) => finishPlacement(st, lib, T0).categories.find((c) => c.skill === k)!;
    expect(cat(after, 'reading').ability).toBeGreaterThan(cat(s, 'reading').ability);
    expect(cat(after, 'kanji').ability).toBeLessThan(cat(s, 'kanji').ability);
    expect(finishPlacement(after, lib, T0).questionCount).toBe(1);
  });

  it('replays reading reveals into the kanji estimate so devices agree', () => {
    const base = { sessionId: 's', itemId: 'v:猫', format: 'ja-to-en' as const, mode: 'choice' as const, skill: 'vocabulary' as const, difficulty: 1.5, response: '', correct: true, deviceId: 'd' };
    const plain: QuizAttempt = { ...base, id: 'a', answeredAt: T0, hlc: '1' };
    const revealed: QuizAttempt = { ...plain, readingShown: true, kanjiDifficulty: 2.5 };
    const k = (a: QuizAttempt) => replayAttempts([a], [], lib, T0).skills.kanji.ability;
    expect(k(revealed)).toBeLessThanOrEqual(k(plain));
    expect(replayAttempts([revealed], [], lib, T0).skills.kanji.evidence).toBe(1);
  });
});

describe('level-pack content', () => {
  it('uses the notes carried by a pack exercise for wrong answers', async () => {
    const { explainWrong } = await import('./answers');
    const { indexLibrary } = await import('@jc/japanese-content');
    const grammar = {
      ...lib.items.find((i) => i.type === 'grammar')!,
      id: 'g:pack-test',
      exercises: [{ id: 'pack-test-1', kind: 'fill-blank' as const, prompt: '雨が降っ＿＿、行きません。', answer: 'たら', distractors: ['ても', 'ながら'], distractorNotes: { ても: 'ても means "even if".', ながら: 'ながら joins two simultaneous actions.' }, explanation: 'たら sets a condition.' }],
    };
    const custom = indexLibrary([...lib.items, grammar]);
    const q = buildQuestion(grammar, 'fill-blank', 'choice', { library: custom, rng: createRng(2) })!;
    expect(explainWrong(q, 'ても', checkAnswer(q, 'ても'))).toContain('even if');
  });

  it('keeps verbs with irregular conjugation out of conjugation drills', async () => {
    const { indexLibrary } = await import('@jc/japanese-content');
    const verbs = lib.items.filter((i) => i.type === 'vocab' && (i.partOfSpeech === 'verb-godan' || i.partOfSpeech === 'verb-ichidan'));
    const tagged = verbs.map((v) => (v.id === 'v:行く' ? v : { ...v, tags: [...v.tags, 'irregular-conjugation'] }));
    const custom = indexLibrary([...lib.items.filter((i) => !verbs.includes(i)), ...tagged]);
    const form = custom.items.find((i) => i.id === 'c:masu')!;
    const regularVerbs = new Set(verbs.map((v) => v.ja));
    const drilled = new Set<string>();
    for (let s = 0; s < 40; s++) drilled.add(buildQuestion(form, 'conjugate', 'choice', { library: custom, rng: createRng(s), conjugationMaxDifficulty: 10 })!.prompt);
    // Only 行く is left untagged among godan/ichidan verbs; する-verbs and 来る may still appear.
    expect(drilled.size).toBeGreaterThan(1);
    expect([...drilled].filter((p) => regularVerbs.has(p) && p !== '行く')).toEqual([]);
  });
});
