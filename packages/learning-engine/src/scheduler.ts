import type { PauseState, QuietHours, ScheduledOpportunity, SchedulerDecision, UserSettings } from '@jc/shared-types';
import {
  DAY,
  MINUTE,
  addDaysToKey,
  createRng,
  formatMinutes,
  isWithinWindow,
  localDateKey,
  localTimeToTs,
  minutesOfDay,
  randInt,
} from '@jc/shared-utils';

/**
 * Interruption policy. The learning engine decides *what* to review; this
 * module decides *whether and when* to offer a session. It is pure and
 * deterministic so every decision can be tested and explained.
 */

export function isPaused(pause: PauseState, now: number): boolean {
  return pause.indefinite || (pause.until !== null && pause.until > now);
}

export function inQuietHours(qh: QuietHours, now: number, timeZone: string): boolean {
  return qh.enabled && isWithinWindow(minutesOfDay(now, timeZone), qh.start, qh.end);
}

/** Next instant quiet hours end (or `now` if not in quiet hours). */
export function quietHoursEnd(qh: QuietHours, now: number, timeZone: string): number {
  if (!inQuietHours(qh, now, timeZone)) return now;
  const today = localDateKey(now, timeZone);
  let end = localTimeToTs(today, qh.end, timeZone);
  if (end <= now) end = localTimeToTs(addDaysToKey(today, 1), qh.end, timeZone);
  return end;
}

export function startOfNextLocalDay(now: number, timeZone: string): number {
  return localTimeToTs(addDaysToKey(localDateKey(now, timeZone), 1), 0, timeZone);
}

/** Deterministic randomized interval so prompts do not feel mechanical. */
export function nextPromptInterval(settings: Pick<UserSettings, 'popupIntervalMinMinutes' | 'popupIntervalMaxMinutes'>, seed: string): number {
  const min = Math.max(5, Math.min(settings.popupIntervalMinMinutes, settings.popupIntervalMaxMinutes));
  const max = Math.max(min, settings.popupIntervalMaxMinutes);
  return randInt(createRng(seed), min, max);
}

export interface DesktopSchedulerInput {
  now: number;
  timeZone: string;
  settings: Pick<
    UserSettings,
    'quietHours' | 'dailyGoalQuestions' | 'maxDailyInterruptions' | 'minMinutesBetweenInterruptions' | 'popupIntervalMinMinutes' | 'popupIntervalMaxMinutes'
  >;
  pause: PauseState;
  snoozeUntil: number | null;
  appStartedAt: number;
  lastPromptAt: number | null;
  promptsToday: number;
  questionsToday: number;
  dueCount: number;
  newAvailable: boolean;
  /** Minutes of non-idle activity accumulated since the last prompt or session. */
  activeMinutes: number;
  /** Randomized active-minutes threshold chosen for this cycle. */
  targetActiveMinutes: number;
  /** Whether the user is currently idle (away from the computer). */
  idle: boolean;
}

export const STARTUP_GRACE_MINUTES = 10;

export function decideDesktopPrompt(i: DesktopSchedulerInput): SchedulerDecision {
  const soon = i.now + MINUTE;
  if (isPaused(i.pause, i.now)) {
    return {
      show: false,
      reason: i.pause.indefinite ? 'Paused until you resume.' : `Paused until ${new Date(i.pause.until ?? 0).toLocaleTimeString()}.`,
      nextCheckAt: i.pause.indefinite ? i.now + 15 * MINUTE : Math.max(soon, i.pause.until ?? soon),
    };
  }
  if (i.snoozeUntil !== null && i.snoozeUntil > i.now) {
    return { show: false, reason: 'Snoozed.', nextCheckAt: i.snoozeUntil };
  }
  if (inQuietHours(i.settings.quietHours, i.now, i.timeZone)) {
    return { show: false, reason: `Quiet hours until ${formatMinutes(i.settings.quietHours.end)}.`, nextCheckAt: quietHoursEnd(i.settings.quietHours, i.now, i.timeZone) };
  }
  if (i.settings.dailyGoalQuestions > 0 && i.questionsToday >= i.settings.dailyGoalQuestions) {
    return { show: false, reason: 'Daily goal reached — see you tomorrow!', nextCheckAt: startOfNextLocalDay(i.now, i.timeZone) };
  }
  if (i.promptsToday >= i.settings.maxDailyInterruptions) {
    return { show: false, reason: 'Daily interruption limit reached.', nextCheckAt: startOfNextLocalDay(i.now, i.timeZone) };
  }
  if (i.now - i.appStartedAt < STARTUP_GRACE_MINUTES * MINUTE) {
    return { show: false, reason: 'Just started — giving you time to settle in.', nextCheckAt: i.appStartedAt + STARTUP_GRACE_MINUTES * MINUTE };
  }
  if (i.lastPromptAt !== null && i.now - i.lastPromptAt < i.settings.minMinutesBetweenInterruptions * MINUTE) {
    return { show: false, reason: 'Too soon after the last check-in.', nextCheckAt: i.lastPromptAt + i.settings.minMinutesBetweenInterruptions * MINUTE };
  }
  if (i.dueCount === 0 && !i.newAvailable) {
    return { show: false, reason: 'Nothing useful to review right now.', nextCheckAt: i.now + 15 * MINUTE };
  }
  if (i.activeMinutes < i.targetActiveMinutes) {
    const remaining = i.targetActiveMinutes - i.activeMinutes;
    return { show: false, reason: `Waiting for ${Math.ceil(remaining)} more active minutes.`, nextCheckAt: i.now + Math.min(remaining, 5) * MINUTE };
  }
  if (i.idle) {
    return { show: false, reason: 'You seem to be away — will check in when you are back.', nextCheckAt: soon };
  }
  const what = i.dueCount > 0 ? `${i.dueCount} review${i.dueCount === 1 ? '' : 's'} due` : 'Something new to learn';
  return { show: true, reason: `${what} · ${Math.round(i.activeMinutes)} active minutes since the last check-in.`, nextCheckAt: i.now + i.settings.minMinutesBetweenInterruptions * MINUTE };
}

// ---------------------------------------------------------------------------
// Mobile notification planning
// ---------------------------------------------------------------------------

export interface MobilePlanInput {
  now: number;
  timeZone: string;
  settings: Pick<
    UserSettings,
    'quietHours' | 'reminderTimes' | 'mobileRemindersPerDay' | 'notificationsEnabled' | 'notificationCategories' | 'dailyGoalQuestions'
  >;
  pause: PauseState;
  /** Sorted next-review instants of all introduced items. */
  dueTimes: number[];
  newAvailable: boolean;
  studiedToday: boolean;
  questionsToday: number;
  streakDays: number;
  days?: number;
  /** iOS allows 64 pending local notifications; stay well under it. */
  maxNotifications?: number;
}

/** Evenly spread default reminder slots if the user has not chosen times. */
export function defaultReminderTimes(count: number): number[] {
  const start = 9 * 60;
  const end = 20 * 60;
  if (count <= 1) return [19 * 60];
  return Array.from({ length: count }, (_, k) => Math.round(start + ((end - start) * k) / (count - 1)));
}

function dueAt(dueTimes: number[], at: number): number {
  let lo = 0;
  let hi = dueTimes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((dueTimes[mid] as number) <= at) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Plan local notifications for the next few days. Skips quiet hours, pauses
 * and slots with nothing useful to do, dedupes identical times, and caps the
 * total for OS limits. Delivery times are best-effort: the OS may defer them.
 */
export function planMobileNotifications(i: MobilePlanInput): ScheduledOpportunity[] {
  if (!i.settings.notificationsEnabled || i.pause.indefinite) return [];
  const days = i.days ?? 7;
  const max = i.maxNotifications ?? 40;
  const times = (i.settings.reminderTimes.length ? i.settings.reminderTimes : defaultReminderTimes(i.settings.mobileRemindersPerDay))
    .slice()
    .sort((a, b) => a - b)
    .slice(0, Math.max(1, i.settings.mobileRemindersPerDay));
  const out: ScheduledOpportunity[] = [];
  const seen = new Set<number>();
  const today = localDateKey(i.now, i.timeZone);
  const goalMetToday = i.settings.dailyGoalQuestions > 0 && i.questionsToday >= i.settings.dailyGoalQuestions;
  for (let d = 0; d < days && out.length < max; d++) {
    const key = addDaysToKey(today, d);
    times.forEach((minute, idx) => {
      if (out.length >= max) return;
      const at = localTimeToTs(key, minute, i.timeZone);
      if (at <= i.now + MINUTE || seen.has(at)) return;
      if (i.pause.until !== null && at < i.pause.until) return;
      if (i.settings.quietHours.enabled && isWithinWindow(minute, i.settings.quietHours.start, i.settings.quietHours.end)) return;
      if (d === 0 && goalMetToday) return;
      const due = dueAt(i.dueTimes, at);
      const isLast = idx === times.length - 1;
      if (i.settings.notificationCategories.reviews && due > 0) {
        seen.add(at);
        out.push({ at, kind: 'review', reason: `${due} review${due === 1 ? '' : 's'} expected to be due at ${formatMinutes(minute)}.` });
      } else if (i.settings.notificationCategories.reviews && i.newAvailable && idx === 0) {
        seen.add(at);
        out.push({ at, kind: 'new-material', reason: 'Nothing is due, but there is new material to learn.' });
      } else if (i.settings.notificationCategories.streak && isLast && !(d === 0 && i.studiedToday)) {
        seen.add(at);
        out.push({ at, kind: 'streak', reason: i.streakDays > 0 ? `Keep your ${i.streakDays}-day streak going.` : 'A short session to start a streak.' });
      }
    });
  }
  return out;
}

export function describeNextOpportunity(op: ScheduledOpportunity | undefined, now: number): string {
  if (!op) return 'No reminders scheduled.';
  const mins = Math.round((op.at - now) / MINUTE);
  if (mins < 60) return `Next reminder in ${mins} min — ${op.reason}`;
  const hours = Math.round(mins / 60);
  if (op.at - now < DAY) return `Next reminder in about ${hours} h — ${op.reason}`;
  return `Next reminder in ${Math.round((op.at - now) / DAY)} days — ${op.reason}`;
}
