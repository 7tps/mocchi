import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SKILLS, type Skill, type UserSettings } from '@jc/shared-types';
import { SKILL_LABELS, t } from '@jc/design-system';
import { useAppState, useTutor } from '../../src/service';
import { useTheme, FONT_DISPLAY } from '../../src/theme';
import { Body, Button, Panel, StepperRow, Title, ToggleRow } from '../../src/components/ui';

export default function Settings() {
  const svc = useTutor();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  if (!state) return null;
  const s = state.settings;
  const set = (p: Partial<UserSettings>) => void svc.updateSettings(p);
  const toggleSkill = (k: Skill) => set({ enabledSkills: s.enabledSkills.includes(k) ? s.enabledSkills.filter((x) => x !== k) : [...s.enabledSkills, k] });
  const paused = state.pause.indefinite || state.pause.until !== null;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('settings.pause')}
        </Title>
        {paused ? (
          <Button theme={theme} variant="primary" label={t('home.resume')} onPress={() => void svc.resume()} />
        ) : (
          <View style={{ gap: 8 }}>
            <Button theme={theme} label={t('settings.pause1h')} onPress={() => void svc.pause('1h')} />
            <Button theme={theme} label={t('settings.pauseTomorrow')} onPress={() => void svc.pause('tomorrow')} />
            <Button theme={theme} label={t('settings.pauseForever')} onPress={() => void svc.pause('indefinite')} />
          </View>
        )}
      </Panel>

      <Panel theme={theme}>
        <Title theme={theme} size={18}>
          {t('settings.learning')}
        </Title>
        <StepperRow theme={theme} label={t('settings.dailyGoal')} value={s.dailyGoalQuestions} min={0} max={200} step={5} onChange={(v) => set({ dailyGoalQuestions: v })} />
        <StepperRow theme={theme} label={t('settings.sessionLength')} value={s.sessionLength} min={2} max={5} onChange={(v) => set({ sessionLength: v })} />
        <StepperRow theme={theme} label={t('settings.newItems')} value={s.newItemsPerSession} min={0} max={5} onChange={(v) => set({ newItemsPerSession: v })} />
        <Body theme={theme} style={{ marginTop: 8 }}>
          {t('settings.skills')}
        </Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {SKILLS.filter((k) => k !== 'listening' || state.listeningAvailable).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.enabledSkills.includes(k) }}
              onPress={() => toggleSkill(k)}
              style={{ borderWidth: 2, borderColor: s.enabledSkills.includes(k) ? theme.accent : theme.border, paddingHorizontal: 10, paddingVertical: 6, minHeight: 36 }}
            >
              <Text style={{ fontFamily: FONT_DISPLAY, color: theme.text }}>{SKILL_LABELS[k]}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      <Panel theme={theme}>
        <Title theme={theme} size={18}>
          {t('settings.appearance')}
        </Title>
        <ToggleRow theme={theme} label={`${t('settings.theme')}: ${s.theme === 'night' ? t('settings.themeNight') : t('settings.themePaper')}`} value={s.theme === 'night'} onChange={(v) => set({ theme: v ? 'night' : 'paper' })} />
        <ToggleRow theme={theme} label={t('settings.characterAnimation')} value={s.characterAnimation} onChange={(v) => set({ characterAnimation: v })} />
        <ToggleRow theme={theme} label={t('settings.reducedMotion')} value={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
        <ToggleRow theme={theme} label={t('settings.sound')} value={s.soundEffects} onChange={(v) => set({ soundEffects: v })} />
        <ToggleRow theme={theme} label={t('settings.haptics')} value={s.haptics} onChange={(v) => set({ haptics: v })} />
        <ToggleRow theme={theme} label={t('settings.romaji')} value={s.showRomaji} onChange={(v) => set({ showRomaji: v })} />
        <ToggleRow theme={theme} label={t('settings.translations')} value={s.showTranslations} onChange={(v) => set({ showTranslations: v })} />
      </Panel>

      <View style={{ gap: 8 }}>
        <Button theme={theme} label={t('settings.notifications')} onPress={() => router.push('/notifications')} />
        <Button theme={theme} label="Account, sync & privacy" onPress={() => router.push('/account')} />
        <Button theme={theme} label={t('nav.character')} onPress={() => router.push('/character')} />
      </View>
    </ScrollView>
  );
}
