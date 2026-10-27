import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAppState } from '../src/service';

export default function Index() {
  const state = useAppState();
  if (!state) return <View />;
  return <Redirect href={state.onboarded ? '/(tabs)' : '/onboarding'} />;
}
