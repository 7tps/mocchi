import { SKILLS, type Skill, type UserSettings } from '@jc/shared-types';

export const DEFAULT_ENABLED_SKILLS: Skill[] = SKILLS.filter((s) => s !== 'listening');

export function defaultSettings(): UserSettings {
  return {
    dailyGoalQuestions: 20,
    sessionLength: 3,
    enabledSkills: [...DEFAULT_ENABLED_SKILLS],
    newItemsPerSession: 2,
    quietHours: { enabled: true, start: 22 * 60, end: 8 * 60 },
    popupEnabled: true,
    popupIntervalMinMinutes: 30,
    popupIntervalMaxMinutes: 60,
    popupTakesFocus: false,
    maxDailyInterruptions: 10,
    minMinutesBetweenInterruptions: 20,
    launchAtStartup: false,
    characterVisible: true,
    desktopNotifications: true,
    notifyAlongsidePopup: false,
    notificationsEnabled: false,
    notificationCategories: { reviews: true, streak: true, milestones: true },
    reminderTimes: [9 * 60, 13 * 60, 19 * 60 + 30],
    mobileRemindersPerDay: 3,
    haptics: true,
    characterAnimation: true,
    soundEffects: true,
    showRomaji: false,
    showTranslations: true,
    theme: 'night',
    reducedMotion: false,
    syncEnabled: false,
    syncServerUrl: 'http://localhost:8787',
    updatedAt: {},
  };
}

/** Settings that describe one device and therefore never sync. */
export const DEVICE_LOCAL_SETTINGS: ReadonlyArray<keyof UserSettings> = ['launchAtStartup', 'syncEnabled', 'syncServerUrl', 'updatedAt'];

/** Clamp and sanitise a settings patch from the UI or a synced device. */
export function sanitizeSettings(s: UserSettings): UserSettings {
  const int = (v: unknown, min: number, max: number, fallback: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
    return Math.min(max, Math.max(min, n));
  };
  const d = defaultSettings();
  const minutes = (v: unknown, fallback: number) => int(v, 0, 24 * 60 - 1, fallback);
  const popupMin = int(s.popupIntervalMinMinutes, 5, 480, d.popupIntervalMinMinutes);
  return {
    ...s,
    dailyGoalQuestions: int(s.dailyGoalQuestions, 0, 500, d.dailyGoalQuestions),
    sessionLength: int(s.sessionLength, 2, 5, d.sessionLength),
    newItemsPerSession: int(s.newItemsPerSession, 0, 5, d.newItemsPerSession),
    enabledSkills: (s.enabledSkills ?? d.enabledSkills).filter((k): k is Skill => (SKILLS as readonly string[]).includes(k)),
    quietHours: { enabled: !!s.quietHours?.enabled, start: minutes(s.quietHours?.start, d.quietHours.start), end: minutes(s.quietHours?.end, d.quietHours.end) },
    popupIntervalMinMinutes: popupMin,
    popupIntervalMaxMinutes: int(s.popupIntervalMaxMinutes, popupMin, 600, Math.max(popupMin, d.popupIntervalMaxMinutes)),
    maxDailyInterruptions: int(s.maxDailyInterruptions, 1, 50, d.maxDailyInterruptions),
    minMinutesBetweenInterruptions: int(s.minMinutesBetweenInterruptions, 5, 480, d.minMinutesBetweenInterruptions),
    reminderTimes: [...new Set((s.reminderTimes ?? d.reminderTimes).map((m) => minutes(m, 9 * 60)))].sort((a, b) => a - b).slice(0, 6),
    mobileRemindersPerDay: int(s.mobileRemindersPerDay, 1, 6, d.mobileRemindersPerDay),
    theme: s.theme === 'paper' ? 'paper' : 'night',
  };
}
