import { describe, expect, it } from 'vitest';
import type { LearningSession, SessionType } from '@jc/shared-types';
import { DAY, HOUR, MINUTE, localDateKey } from '@jc/shared-utils';
import { assessHabit, restingMood } from './habit';

const TZ = 'Asia/Tokyo';
const NOW = Date.UTC(2026, 9, 27, 6, 0); // 15:00 in Tokyo
type S = Pick<LearningSession, 'type' | 'startedAt' | 'completedAt' | 'questionCount' | 'localDate'>;
const done = (at: number, type: SessionType = 'manual'): S => ({ type, startedAt: at - 3 * MINUTE, completedAt: at, questionCount: 3, localDate: localDateKey(at - 3 * MINUTE, TZ) });
const skipped = (at: number): S => ({ type: 'scheduled', startedAt: at, questionCount: 0, localDate: localDateKey(at, TZ) });
const habit = (sessions: S[], extra: { goalReachedToday?: boolean; onboardedAt?: number } = {}) =>
  assessHabit({ now: NOW, timeZone: TZ, sessions, goalReachedToday: extra.goalReachedToday ?? false, onboardedAt: extra.onboardedAt ?? NOW - 30 * DAY });

describe('assessHabit', () => {
  it('is thrilled by regular study', () => {
    const h = habit([0, 1, 2, 4].map((d) => done(NOW - d * DAY - HOUR)));
    expect(h).toMatchObject({ state: 'thriving', mood: 'happy', activeDays: 4 });
    expect(habit([done(NOW - HOUR)], { goalReachedToday: true }).state).toBe('thriving');
  });

  it('is content after a session in the last day', () => {
    expect(habit([done(NOW - 20 * HOUR)])).toMatchObject({ state: 'steady', mood: 'idle', daysSinceStudy: 0 });
  });

  it('waits, then gets sad, as days pass without a session', () => {
    expect(habit([done(NOW - 1.5 * DAY)])).toMatchObject({ state: 'missed', mood: 'waiting', daysSinceStudy: 1 });
    expect(habit([done(NOW - 4 * DAY)])).toMatchObject({ state: 'away', mood: 'sad', daysSinceStudy: 4 });
  });

  it('is sad when check-ins keep getting closed, until a session is finished', () => {
    const closed = [skipped(NOW - 3 * HOUR), skipped(NOW - HOUR)];
    expect(habit([done(NOW - 5 * HOUR), ...closed])).toMatchObject({ state: 'skipping', mood: 'sad', skippedCheckIns: 2 });
    // One closed check-in is fine; so is one still on screen.
    expect(habit([done(NOW - 5 * HOUR), skipped(NOW - HOUR), skipped(NOW - 5 * MINUTE)]).state).toBe('steady');
    // Finishing a session afterwards clears it.
    expect(habit([...closed, done(NOW - 30 * MINUTE)]).state).toBe('steady');
  });

  it('does not count a fresh start as missed', () => {
    expect(habit([], { onboardedAt: NOW - HOUR })).toMatchObject({ state: 'new', daysSinceStudy: null });
    expect(habit([], { onboardedAt: NOW - 5 * DAY })).toMatchObject({ state: 'away', daysAway: 5 });
  });
});

describe('restingMood', () => {
  const steady = { state: 'steady', mood: 'idle' } as const;
  it('sleeps when paused, otherwise shows strong habit moods before due reviews', () => {
    expect(restingMood({ state: 'away', mood: 'sad' }, { paused: true, due: 3 })).toBe('sleepy');
    expect(restingMood({ state: 'away', mood: 'sad' }, { paused: false, due: 3 })).toBe('sad');
    expect(restingMood(steady, { paused: false, due: 3 })).toBe('waiting');
    expect(restingMood(steady, { paused: false, due: 0 })).toBe('idle');
  });
});
