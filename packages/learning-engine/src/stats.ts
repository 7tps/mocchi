import type { LearningProgress, LearningSession, QuizAttempt, Skill, SkillProfile } from '@jc/shared-types';
import type { ContentLibrary } from '@jc/japanese-content';
import { DAY, MINUTE, addDaysToKey, localDateKey } from '@jc/shared-utils';
import { computeStreak, longestStreak } from './progression';

export interface DashboardStats {
  questionsAnswered: number;
  questionsToday: number;
  recentAccuracy: number | null;
  /** Accuracy on reviews of items that had already graduated (true retention). */
  retention: number | null;
  streakDays: number;
  longestStreak: number;
  totalStudyMs: number;
  sessionsCompleted: number;
  counts: { introduced: number; learning: number; reviewing: number; retained: number };
  vocabulary: { introduced: number; retained: number };
  kanjiReviewed: number;
  grammarPracticed: number;
  dueNow: number;
  dueToday: number;
  /** Reviews coming due on each of the next 7 local days. */
  forecast: Array<{ date: string; count: number }>;
  skills: Array<{ skill: Skill; ability: number; recentAccuracy: number; evidence: number }>;
  studyDays: string[];
}

/** Per-session duration cap so a forgotten open window does not inflate study time. */
const SESSION_CAP_MS = 10 * MINUTE;

export function computeStats(input: {
  library: ContentLibrary;
  progress: LearningProgress[];
  attempts: QuizAttempt[];
  sessions: LearningSession[];
  skills: SkillProfile;
  now: number;
  timeZone: string;
}): DashboardStats {
  const { library, progress, attempts, sessions, now, timeZone } = input;
  const today = localDateKey(now, timeZone);
  const typeOf = (id: string) => library.byId.get(id)?.type;

  const counts = { introduced: 0, learning: 0, reviewing: 0, retained: 0 };
  const vocabulary = { introduced: 0, retained: 0 };
  let kanjiReviewed = 0;
  let grammarPracticed = 0;
  let dueNow = 0;
  let dueToday = 0;
  const forecastMap = new Map<string, number>();
  for (let d = 0; d < 7; d++) forecastMap.set(addDaysToKey(today, d), 0);

  for (const p of progress) {
    if (p.status === 'new') continue;
    counts.introduced++;
    if (p.status === 'learning' || p.status === 'relearning') counts.learning++;
    else if (p.status === 'reviewing') counts.reviewing++;
    else if (p.status === 'retained') counts.retained++;
    const t = typeOf(p.itemId);
    if (t === 'vocab') {
      vocabulary.introduced++;
      if (p.status === 'retained' || (p.status === 'reviewing' && p.intervalDays >= 7)) vocabulary.retained++;
    }
    if (t === 'kanji' && p.attempts > 0) kanjiReviewed++;
    if ((t === 'grammar' || t === 'particle') && p.attempts > 0) grammarPracticed++;
    if (p.nextReviewAt <= now) dueNow++;
    const key = localDateKey(Math.max(p.nextReviewAt, now), timeZone);
    if (key === today) dueToday++;
    if (forecastMap.has(key)) forecastMap.set(key, (forecastMap.get(key) ?? 0) + 1);
  }

  const weekAgo = now - 7 * DAY;
  const recent = attempts.filter((a) => a.answeredAt >= weekAgo);
  const recentAccuracy = recent.length ? recent.filter((a) => a.correct).length / recent.length : null;

  // Retention: answers on items whose previous review had already graduated.
  const sortedAttempts = attempts.slice().sort((a, b) => a.answeredAt - b.answeredAt);
  const seenCount = new Map<string, number>();
  let retentionHits = 0;
  let retentionTotal = 0;
  for (const a of sortedAttempts) {
    const n = (seenCount.get(a.itemId) ?? 0) + 1;
    seenCount.set(a.itemId, n);
    // Third or later exposure in the last 30 days counts as a retention check.
    if (n >= 3 && a.answeredAt >= now - 30 * DAY) {
      retentionTotal++;
      if (a.correct) retentionHits++;
    }
  }

  const completed = sessions.filter((s) => s.completedAt && s.type !== 'placement');
  const studyDays = [...new Set(completed.map((s) => s.localDate))].sort();
  const totalStudyMs = completed.reduce((acc, s) => acc + Math.min(SESSION_CAP_MS, Math.max(0, (s.completedAt ?? s.startedAt) - s.startedAt)), 0);

  return {
    questionsAnswered: attempts.length,
    questionsToday: attempts.filter((a) => localDateKey(a.answeredAt, timeZone) === today).length,
    recentAccuracy,
    retention: retentionTotal >= 5 ? retentionHits / retentionTotal : null,
    streakDays: computeStreak(studyDays, today),
    longestStreak: longestStreak(studyDays),
    totalStudyMs,
    sessionsCompleted: completed.length,
    counts,
    vocabulary,
    kanjiReviewed,
    grammarPracticed,
    dueNow,
    dueToday,
    forecast: [...forecastMap.entries()].map(([date, count]) => ({ date, count })),
    skills: (Object.values(input.skills) as SkillProfile[Skill][]).map((s) => ({
      skill: s.skill,
      ability: s.ability,
      recentAccuracy: s.recentAccuracy,
      evidence: s.evidence,
    })),
    studyDays,
  };
}
