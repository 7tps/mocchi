import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CharacterMood, ExperienceLevel, PlacementResult, UserSettings } from '@jc/shared-types';
import { t, type StringKey } from '@jc/design-system';
import { useAppState, useTutor } from '../src/service';
import { useTheme, FONT_DISPLAY } from '../src/theme';
import { requestPermission } from '../src/notifications';
import { Mocchi } from '../src/components/Mocchi';
import { PlacementResultView, PlacementRunner } from '../src/components/Placement';
import { Body, Button, Panel, StepperRow, Title, ToggleRow } from '../src/components/ui';

type Step = 'welcome' | 'how' | 'experience' | 'exam-intro' | 'exam' | 'results' | 'prefs' | 'notify' | 'done';
const EXPERIENCES: ExperienceLevel[] = ['none', 'kana', 'beginner', 'intermediate', 'advanced'];

export default function Onboarding() {
  const svc = useTutor();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const [step, setStep] = useState<Step>(state?.placementInProgress ? 'exam' : 'welcome');
  const [experience, setExperience] = useState<ExperienceLevel>('none');
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [prefs, setPrefs] = useState<Partial<UserSettings>>({});
  const [mood, setMood] = useState<CharacterMood>('happy');
  const [permission, setPermission] = useState<string | null>(null);
  if (!state) return null;
  const s = { ...state.settings, ...prefs };
  const set = (p: Partial<UserSettings>) => setPrefs((x) => ({ ...x, ...p }));

  const finish = async () => {
    await svc.completeOnboarding({ experience, settings: prefs });
    router.replace('/(tabs)');
  };

  const body = (() => {
    switch (step) {
      case 'welcome':
        return (
          <>
            <Title theme={theme}>{t('onboard.welcome.title')}</Title>
            <Body theme={theme}>{t('onboard.welcome.body')}</Body>
            <Button theme={theme} variant="primary" label={t('common.continue')} onPress={() => setStep('how')} />
          </>
        );
      case 'how':
        return (
          <>
            <Title theme={theme}>{t('onboard.how.title')}</Title>
            {(['onboard.how.1', 'onboard.how.2', 'onboard.how.3'] as const).map((k, i) => (
              <Body key={k} theme={theme}>
                {i + 1}. {t(k)}
              </Body>
            ))}
            <Button theme={theme} variant="primary" label={t('common.continue')} onPress={() => setStep('experience')} />
          </>
        );
      case 'experience':
        return (
          <>
            <Title theme={theme}>{t('onboard.experience.title')}</Title>
            {EXPERIENCES.map((e) => (
              <Pressable
                key={e}
                accessibilityRole="radio"
                accessibilityState={{ checked: experience === e }}
                onPress={() => setExperience(e)}
                style={{ borderWidth: 2, borderColor: experience === e ? theme.accent : theme.borderStrong, backgroundColor: theme.surface, padding: 12, minHeight: 56 }}
              >
                <Text style={{ fontFamily: FONT_DISPLAY, color: theme.text, fontSize: 16 }}>{t(`onboard.experience.${e}` as StringKey)}</Text>
                <Text style={{ color: theme.textDim, fontSize: 13 }}>{t(`onboard.experience.${e}.sub` as StringKey)}</Text>
              </Pressable>
            ))}
            <Button theme={theme} variant="primary" label={t('common.continue')} onPress={() => setStep('exam-intro')} />
          </>
        );
      case 'exam-intro':
        return (
          <>
            <Title theme={theme}>{t('onboard.exam.title')}</Title>
            <Body theme={theme}>{t('onboard.exam.body')}</Body>
            <Button theme={theme} variant="primary" label={t('onboard.exam.start')} onPress={() => setStep('exam')} />
            <Body theme={theme} dim small>
              {t('onboard.exam.beginnerNote')}
            </Body>
            <Button
              theme={theme}
              label={t('onboard.exam.beginner')}
              onPress={async () => {
                setResult(await svc.startAsBeginner());
                setStep('results');
              }}
            />
          </>
        );
      case 'exam':
        return (
          <PlacementRunner
            theme={theme}
            experience={experience}
            resume={state.placementInProgress}
            onMood={setMood}
            onDone={(r) => {
              setResult(r);
              setMood('celebrating');
              setStep('results');
            }}
          />
        );
      case 'results':
        return (
          <>
            <Title theme={theme}>{t('onboard.results.title')}</Title>
            {result ? <PlacementResultView theme={theme} result={result} /> : null}
            <Button theme={theme} variant="primary" label={t('common.continue')} onPress={() => setStep('prefs')} />
          </>
        );
      case 'prefs':
        return (
          <>
            <Title theme={theme}>{t('onboard.prefs.title')}</Title>
            <StepperRow theme={theme} label={t('settings.dailyGoal')} value={s.dailyGoalQuestions} min={5} max={100} step={5} onChange={(v) => set({ dailyGoalQuestions: v })} />
            <StepperRow theme={theme} label={t('settings.sessionLength')} value={s.sessionLength} min={2} max={5} onChange={(v) => set({ sessionLength: v })} />
            <StepperRow theme={theme} label={t('settings.remindersPerDay')} value={s.mobileRemindersPerDay} min={1} max={6} onChange={(v) => set({ mobileRemindersPerDay: v })} />
            <ToggleRow theme={theme} label={t('settings.quiet')} value={s.quietHours.enabled} onChange={(v) => set({ quietHours: { ...s.quietHours, enabled: v } })} hint="22:00–08:00 by default" />
            <Button theme={theme} variant="primary" label={t('common.continue')} onPress={() => setStep('notify')} />
            <Button
              theme={theme}
              variant="ghost"
              label={t('onboard.prefs.skip')}
              onPress={() => {
                setPrefs({});
                setStep('notify');
              }}
            />
          </>
        );
      case 'notify':
        return (
          <>
            <Title theme={theme}>{t('onboard.notify.title')}</Title>
            <Body theme={theme}>{t('onboard.notify.body')}</Body>
            {permission === 'denied' ? (
              <Body theme={theme} dim small>
                {t('notify.permissionDenied')}
              </Body>
            ) : null}
            <Button
              theme={theme}
              variant="primary"
              label="Allow reminders"
              onPress={async () => {
                const p = await requestPermission();
                setPermission(p);
                set({ notificationsEnabled: p === 'granted' });
                setStep('done');
              }}
            />
            <Button
              theme={theme}
              variant="ghost"
              label="Not now"
              onPress={() => {
                set({ notificationsEnabled: false });
                setStep('done');
              }}
            />
          </>
        );
      case 'done':
        return (
          <>
            <Title theme={theme}>{t('onboard.done.title')}</Title>
            <Body theme={theme}>{t('onboard.done.body')}</Body>
            <Button theme={theme} variant="primary" label={t('common.start')} onPress={() => void finish()} />
          </>
        );
    }
  })();

  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center' }}>
          <Mocchi mood={step === 'done' ? 'celebrating' : step === 'welcome' ? 'happy' : mood} size={step === 'exam' ? 72 : 128} animate={animate} />
        </View>
        <Panel theme={theme} style={{ gap: 12 }}>
          {body}
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}
