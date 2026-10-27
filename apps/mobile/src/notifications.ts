import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { TutorService } from '@jc/app-core';
import type { ScheduledOpportunity } from '@jc/shared-types';
import { t } from '@jc/design-system';

/**
 * Local notifications computed on the device from the shared planner.
 * Remote push is not required. Delivery times are best-effort: iOS and
 * Android may defer or batch notifications (battery saver, Doze).
 */

export const CHANNEL_ID = 'reviews';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function setupChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Review reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#7fd3a8',
  });
}

export async function getPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Ask only after explaining the benefit (called from onboarding / settings). */
export async function requestPermission(): Promise<PermissionState> {
  await setupChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const r = await Notifications.requestPermissionsAsync();
  return r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied';
}

function content(op: ScheduledOpportunity, dueHint: number): Notifications.NotificationContentInput {
  const data = { route: '/session', source: 'notification', kind: op.kind };
  switch (op.kind) {
    case 'review':
      return { title: t('notify.review.title'), body: t('notify.review.body', { n: Math.max(1, dueHint), minutes: Math.max(1, Math.round(dueHint * 0.4)) }), data };
    case 'streak': {
      const m = /(\d+)-day/.exec(op.reason);
      return { title: t('notify.streak.title'), body: m ? t('notify.streak.body', { n: m[1] ?? '' }) : t('notify.streak.start'), data };
    }
    case 'milestone':
      return { title: t('notify.milestone.title'), body: op.reason, data };
    default:
      return { title: t('notify.new.title'), body: t('notify.new.body'), data };
  }
}

/**
 * Replace all scheduled reminders with a fresh plan. Called after sessions,
 * settings changes and whenever the app returns to the foreground, so there
 * are never stale or duplicate notifications.
 */
export async function reschedule(service: TutorService): Promise<{ scheduled: number; permission: PermissionState }> {
  const permission = await getPermission();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const state = await service.getAppState();
  if (permission !== 'granted' || !state.settings.notificationsEnabled) return { scheduled: 0, permission };
  const plan = await service.planNotifications();
  for (const op of plan) {
    const due = Number(/^(\d+)/.exec(op.reason)?.[1] ?? 0);
    await Notifications.scheduleNotificationAsync({
      content: content(op, due),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(op.at), channelId: CHANNEL_ID },
    });
  }
  return { scheduled: plan.length, permission };
}

/** Immediate celebration (milestones), if the user allows that category. */
export async function celebrate(service: TutorService, title: string): Promise<void> {
  const state = await service.getAppState();
  if (!state.settings.notificationsEnabled || !state.settings.notificationCategories.milestones) return;
  if ((await getPermission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({ content: { title: t('notify.milestone.title'), body: title }, trigger: null });
}
