import type { ThemeName } from '@jc/shared-types';

/** Base colours shared by both platforms. */
export const palette = {
  navy950: '#0b0f1c',
  navy900: '#10162a',
  navy800: '#161e37',
  navy700: '#1f2a4a',
  navy600: '#2b3a63',
  navy500: '#3b4d80',
  cream: '#f4ead8',
  creamDim: '#c9c0ae',
  creamFaint: '#8d8778',
  mint: '#7fd3a8',
  mintDark: '#3f9b78',
  teal: '#4fb3a9',
  coral: '#e88a7f',
  coralDark: '#c4594e',
  gold: '#f3c969',
  pink: '#f6b8c8',
  sky: '#8aa6e6',
  paper: '#f7f1e3',
  paperDim: '#ebe2cd',
  ink: '#1b2238',
} as const;

export interface Theme {
  name: ThemeName;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentText: string;
  good: string;
  bad: string;
  warn: string;
  focus: string;
  shadow: string;
}

export const themes: Record<ThemeName, Theme> = {
  night: {
    name: 'night',
    bg: palette.navy900,
    surface: palette.navy800,
    surfaceAlt: palette.navy700,
    border: palette.navy600,
    borderStrong: palette.navy500,
    text: palette.cream,
    textDim: palette.creamDim,
    textFaint: palette.creamFaint,
    accent: palette.mint,
    accentText: palette.ink,
    good: palette.mint,
    bad: palette.coral,
    warn: palette.gold,
    focus: palette.gold,
    shadow: palette.navy950,
  },
  paper: {
    name: 'paper',
    bg: palette.paper,
    surface: '#fffaf0',
    surfaceAlt: palette.paperDim,
    border: '#c9bea6',
    borderStrong: '#8f8470',
    text: palette.ink,
    textDim: '#4a5170',
    textFaint: '#7b7f92',
    accent: palette.mintDark,
    accentText: '#ffffff',
    good: '#2f8a63',
    bad: palette.coralDark,
    warn: '#a87b16',
    focus: '#2b3a63',
    shadow: '#c9bea6',
  },
};

/** 4px spacing grid. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 34, jp: 30, jpLarge: 44 } as const;

/** Pixel UI uses hard edges: thick borders and an offset block shadow. */
export const pixel = { border: 2, shadow: 4, radius: 0 } as const;

export const fonts = {
  /** Pixel display face with full Japanese coverage (SIL OFL). */
  display: 'DotGothic16',
  /** Body text: system Japanese fonts stay crisp at small sizes. */
  body: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", "Meiryo", system-ui, sans-serif',
} as const;

export const motion = { fast: 120, base: 200, slow: 320 } as const;
