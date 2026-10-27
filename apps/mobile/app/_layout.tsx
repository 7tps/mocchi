import '../src/platform';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFonts, DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import { themes } from '@jc/design-system';
import { ServiceProvider, useAppState } from '../src/service';
import { useTheme } from '../src/theme';

/** Open the relevant session when a reminder is tapped (also on cold start). */
function useNotificationRouting() {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = last?.notification.request.content.data?.route;
    if (typeof route === 'string' && last?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push({ pathname: '/session', params: { source: 'notification' } });
    }
  }, [last]);
}

function ThemedStack() {
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  useNotificationRouting();
  return (
    <>
      <StatusBar style={theme.name === 'paper' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: 'DotGothic16_400Regular' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session" options={{ title: 'Session', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ title: 'Review queue' }} />
        <Stack.Screen name="character" options={{ title: 'Mocchi' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="account" options={{ title: 'Account & sync' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ DotGothic16_400Regular });
  const splash = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: themes.night.bg }}>
      <ActivityIndicator color={themes.night.accent} />
    </View>
  );
  if (!fontsLoaded) return splash;
  return (
    <ServiceProvider fallback={splash}>
      <ThemedStack />
    </ServiceProvider>
  );
}
