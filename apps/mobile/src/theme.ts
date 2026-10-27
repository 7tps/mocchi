import { useColorScheme } from 'react-native';
import { themes, type Theme } from '@jc/design-system';
import type { ThemeName } from '@jc/shared-types';

export const FONT_DISPLAY = 'DotGothic16_400Regular';

/** The user's chosen theme; "night" is the primary look, "paper" the light variant. */
export function useTheme(name: ThemeName | undefined): Theme {
  const system = useColorScheme();
  return themes[name ?? (system === 'light' ? 'paper' : 'night')];
}
