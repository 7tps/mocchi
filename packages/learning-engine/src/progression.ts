import type { CharacterProgress, LearningProgress, LearningSession } from '@jc/shared-types';
import { addDaysToKey, daysBetweenKeys } from '@jc/shared-utils';

/**
 * Character progression. Rewards consistency (first session of the day,
 * streaks) and has a soft daily cap so grinding gives diminishing returns.
 * It is deliberately independent from question selection.
 */

export const XP_SOFT_CAP_PER_DAY = 150;

export interface XpContext {
  correct: number;
  answered: number;
  firstSessionToday: boolean;
  xpEarnedToday: number;
  streakDays: number;
  goalJustReached: boolean;
}

export function xpForSession(c: XpContext): number {
  if (c.answered === 0) return 0;
  let xp = 4 + c.correct * 2 + (c.answered - c.correct); // effort counts too
  if (c.firstSessionToday) xp += 10;
  xp += Math.min(c.streakDays, 7);
  if (c.goalJustReached) xp += 15;
  const room = Math.max(0, XP_SOFT_CAP_PER_DAY - c.xpEarnedToday);
  const capped = Math.min(xp, room) + Math.max(0, xp - room) * 0.25;
  return Math.max(1, Math.round(capped));
}

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return 40 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; needed: number } {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  return { level, into: xp - start, needed: xpForLevel(level + 1) - start };
}

/** Consecutive study days ending today (or yesterday, so the streak is not lost before you study). */
export function computeStreak(studyDays: Iterable<string>, todayKey: string): number {
  const days = new Set(studyDays);
  let cursor = days.has(todayKey) ? todayKey : addDaysToKey(todayKey, -1);
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

export function longestStreak(studyDays: Iterable<string>): number {
  const sorted = [...new Set(studyDays)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && daysBetweenKeys(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export type UnlockRule =
  | { kind: 'level'; level: number }
  | { kind: 'streak'; days: number }
  | { kind: 'milestone'; id: string };

export interface CosmeticDef {
  id: string;
  name: string;
  description: string;
  unlock: UnlockRule;
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'sprout-bloom', name: 'Blooming sprout', description: 'Your sprout grows a little flower.', unlock: { kind: 'level', level: 2 } },
  { id: 'scarf', name: 'Mint scarf', description: 'A cosy scarf for study sessions.', unlock: { kind: 'level', level: 3 } },
  { id: 'hachimaki', name: 'Hachimaki', description: 'A headband for focus. Earned with a 3-day streak.', unlock: { kind: 'streak', days: 3 } },
  { id: 'glasses', name: 'Reading glasses', description: 'Round glasses for serious reading.', unlock: { kind: 'level', level: 5 } },
  { id: 'sakura', name: 'Sakura pin', description: 'A cherry blossom. Earned with a 7-day streak.', unlock: { kind: 'streak', days: 7 } },
  { id: 'grad-cap', name: 'Graduation cap', description: 'Earned by retaining 50 items.', unlock: { kind: 'milestone', id: 'retained-50' } },
  { id: 'lantern', name: 'Paper lantern', description: 'Earned after 50 sessions.', unlock: { kind: 'milestone', id: 'sessions-50' } },
  { id: 'star-crown', name: 'Star crown', description: 'For reaching level 10.', unlock: { kind: 'level', level: 10 } },
];

export interface MilestoneDef {
  id: string;
  title: string;
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'first-session', title: 'First session complete' },
  { id: 'first-goal', title: 'First daily goal reached' },
  { id: 'streak-3', title: '3-day streak' },
  { id: 'streak-7', title: '7-day streak' },
  { id: 'streak-30', title: '30-day streak' },
  { id: 'introduced-50', title: '50 items introduced' },
  { id: 'introduced-150', title: '150 items introduced' },
  { id: 'retained-50', title: '50 items retained' },
  { id: 'sessions-50', title: '50 sessions' },
  { id: 'level-5', title: 'Reached level 5' },
];

export interface ProgressionSnapshot {
  xp: number;
  streakDays: number;
  sessionsCompleted: number;
  goalReachedEver: boolean;
  introduced: number;
  retained: number;
}

export function achievedMilestones(s: ProgressionSnapshot): string[] {
  const level = levelForXp(s.xp);
  const out: string[] = [];
  if (s.sessionsCompleted >= 1) out.push('first-session');
  if (s.goalReachedEver) out.push('first-goal');
  if (s.streakDays >= 3) out.push('streak-3');
  if (s.streakDays >= 7) out.push('streak-7');
  if (s.streakDays >= 30) out.push('streak-30');
  if (s.introduced >= 50) out.push('introduced-50');
  if (s.introduced >= 150) out.push('introduced-150');
  if (s.retained >= 50) out.push('retained-50');
  if (s.sessionsCompleted >= 50) out.push('sessions-50');
  if (level >= 5) out.push('level-5');
  return out;
}

function unlocked(rule: UnlockRule, level: number, streak: number, milestones: ReadonlySet<string>): boolean {
  switch (rule.kind) {
    case 'level': return level >= rule.level;
    case 'streak': return streak >= rule.days;
    case 'milestone': return milestones.has(rule.id);
  }
}

export interface ProgressionUpdate {
  character: CharacterProgress;
  newMilestones: string[];
  newUnlocks: string[];
  leveledUp: boolean;
}

/** Apply a snapshot to the character. Unlocks and milestones are never taken away. */
export function updateCharacter(prev: CharacterProgress, s: ProgressionSnapshot): ProgressionUpdate {
  const level = levelForXp(s.xp);
  const milestones = new Set([...prev.milestones, ...achievedMilestones(s)]);
  const unlockedNow = new Set(prev.unlocked);
  for (const c of COSMETICS) if (unlocked(c.unlock, level, s.streakDays, milestones)) unlockedNow.add(c.id);
  return {
    character: { xp: s.xp, level, unlocked: [...unlockedNow], selectedCosmetic: prev.selectedCosmetic, milestones: [...milestones] },
    newMilestones: [...milestones].filter((m) => !prev.milestones.includes(m)),
    newUnlocks: [...unlockedNow].filter((u) => !prev.unlocked.includes(u)),
    leveledUp: level > prev.level,
  };
}

export function emptyCharacter(): CharacterProgress {
  return { xp: 0, level: 1, unlocked: [], selectedCosmetic: null, milestones: [] };
}

/** Rebuild the snapshot from history (so it survives sync and replay). */
export function snapshotFrom(sessions: LearningSession[], progress: Iterable<LearningProgress>, todayKey: string, goal: number): ProgressionSnapshot {
  const completed = sessions.filter((s) => s.completedAt && s.type !== 'placement');
  const perDay = new Map<string, number>();
  for (const s of completed) perDay.set(s.localDate, (perDay.get(s.localDate) ?? 0) + s.questionCount);
  let introduced = 0;
  let retained = 0;
  for (const p of progress) {
    if (p.status !== 'new') introduced++;
    if (p.status === 'retained') retained++;
  }
  return {
    xp: completed.reduce((a, s) => a + s.xpAwarded, 0),
    streakDays: computeStreak(perDay.keys(), todayKey),
    sessionsCompleted: completed.length,
    goalReachedEver: goal > 0 && [...perDay.values()].some((n) => n >= goal),
    introduced,
    retained,
  };
}
