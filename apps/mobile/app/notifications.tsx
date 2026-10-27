import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { ScheduledOpportunity } from '@jc/shared-types';
import { formatMinutes } from '@jc/shared-utils';
import { relativeTime, t } from '@jc/design-system';
import { useAppState, useTutor } from '../src/service';
import { useTheme, FONT_DISPLAY } from '../src/theme';
import { getPermission, requestPermission, reschedule, type PermissionState } from '../src/notifications';
import { Body, Button, Panel, StepperRow, Title, ToggleRow } from '../src/components/ui';

const SLOTS = [7 * 60, 8 * 60 + 30, 12 * 60, 13 * 60, 17 * 60 + 30, 19 * 60 + 30, 21 * 60];

export default function NotificationSettings() {
  const svc = useTutor();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [plan, setPlan] = useState<ScheduledOpportunity[]>([]);

  const refresh = useCallback(async () => {
    setPermission(await getPermission());
    setPlan(await svc.planNotifications());
  }, [svc]);
  useEffect(() => {
    void refresh();
    return svc.subscribe(() => void refresh());
  }, [svc, refresh]);

  if (!state) return null;
  const s = state.settings;
  const enable = async (v: boolean) => {
    if (v) {
      const p = await requestPermission();
      setPermission(p);
      if (p !== 'granted') return;
    }
    await svc.updateSettings({ notificationsEnabled: v });
    await reschedule(svc);
  };
  const toggleTime = (m: number) => {
    const times = s.reminderTimes.includes(m) ? s.reminderTimes.filter((x) => x !== m) : [...s.reminderTimes, m].sort((a, b) => a - b);
    void svc.updateSettings({ reminderTimes: times, mobileRemindersPerDay: Math.max(1, Math.min(times.length, 6)) });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {permission === 'denied' ? (
        <Panel theme={theme} style={{ borderColor: theme.bad, gap: 8 }}>
          <Body theme={theme}>{t('notify.permissionDenied')}</Body>
          <Button theme={theme} label="Open system settings" onPress={() => void Linking.openSettings()} />
        </Panel>
      ) : null}
      <Panel theme={theme}>
        <ToggleRow theme={theme} label={t('settings.mobileNotifications')} value={s.notificationsEnabled && permission === 'granted'} onChange={(v) => void enable(v)} />
        <ToggleRow theme={theme} label={t('settings.catReviews')} value={s.notificationCategories.reviews} onChange={(v) => void svc.updateSettings({ notificationCategories: { ...s.notificationCategories, reviews: v } })} />
        <ToggleRow theme={theme} label={t('settings.catStreak')} value={s.notificationCategories.streak} onChange={(v) => void svc.updateSettings({ notificationCategories: { ...s.notificationCategories, streak: v } })} />
        <ToggleRow theme={theme} label={t('settings.catMilestones')} value={s.notificationCategories.milestones} onChange={(v) => void svc.updateSettings({ notificationCategories: { ...s.notificationCategories, milestones: v } })} />
        <StepperRow theme={theme} label={t('settings.remindersPerDay')} value={s.mobileRemindersPerDay} min={1} max={6} onChange={(v) => void svc.updateSettings({ mobileRemindersPerDay: v })} />
      </Panel>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('settings.reminderTimes')}
        </Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[...new Set([...SLOTS, ...s.reminderTimes])].sort((a, b) => a - b).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.reminderTimes.includes(m) }}
              onPress={() => toggleTime(m)}
              style={{ borderWidth: 2, borderColor: s.reminderTimes.includes(m) ? theme.accent : theme.border, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40 }}
            >
              <Text style={{ fontFamily: FONT_DISPLAY, color: theme.text }}>{formatMinutes(m)}</Text>
            </Pressable>
          ))}
        </View>
        <ToggleRow
          theme={theme}
          label={`${t('settings.quiet')} (${formatMinutes(s.quietHours.start)}–${formatMinutes(s.quietHours.end)})`}
          value={s.quietHours.enabled}
          onChange={(v) => void svc.updateSettings({ quietHours: { ...s.quietHours, enabled: v } })}
        />
      </Panel>
      <Panel theme={theme} style={{ gap: 6 }}>
        <Title theme={theme} size={18}>
          Upcoming
        </Title>
        {plan.length === 0 ? (
          <Body theme={theme} dim small>
            No reminders scheduled{s.notificationsEnabled ? ' — nothing useful to review in the coming days.' : '.'}
          </Body>
        ) : (
          plan.slice(0, 6).map((p) => (
            <Body key={p.at} theme={theme} small>
              {new Date(p.at).toLocaleString()} ({relativeTime(p.at, Date.now())}) — {p.reason}
            </Body>
          ))
        )}
        <Body theme={theme} dim small>
          Times are approximate: iOS and Android may delay reminders to save battery.
        </Body>
      </Panel>
    </ScrollView>
  );
}
