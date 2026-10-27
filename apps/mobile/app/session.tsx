import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { CharacterMood, SessionType } from '@jc/shared-types';
import { useAppState } from '../src/service';
import { useTheme } from '../src/theme';
import { Mocchi } from '../src/components/Mocchi';
import { SessionRunner } from '../src/components/Quiz';

/** Short learning session; opened from Home or directly by tapping a reminder. */
export default function Session() {
  const params = useLocalSearchParams<{ source?: string }>();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const [mood, setMood] = useState<CharacterMood>('curious');
  if (!state) return null;
  const type: SessionType = params.source === 'notification' ? 'notification' : params.source === 'review' ? 'review' : 'manual';
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center' }}>
        <Mocchi mood={mood} cosmetic={state.character.selectedCosmetic} size={88} animate={animate} />
      </View>
      {state.onboarded ? (
        <SessionRunner theme={theme} state={state} type={type} reviewOnly={type === 'review'} onMood={setMood} onClose={close} />
      ) : null}
    </ScrollView>
  );
}
