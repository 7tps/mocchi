import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { t } from '@jc/design-system';
import { useAppState } from '../../src/service';
import { useTheme, FONT_DISPLAY } from '../../src/theme';

const glyph = (g: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18, fontFamily: FONT_DISPLAY }}>{g}</Text>;
  };

export default function TabsLayout() {
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: FONT_DISPLAY },
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: 2 },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarLabelStyle: { fontFamily: FONT_DISPLAY },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home'), tabBarIcon: glyph('家') }} />
      <Tabs.Screen name="progress" options={{ title: t('nav.progress'), tabBarIcon: glyph('進') }} />
      <Tabs.Screen name="library" options={{ title: t('nav.library'), tabBarIcon: glyph('本') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings'), tabBarIcon: glyph('設') }} />
    </Tabs>
  );
}
