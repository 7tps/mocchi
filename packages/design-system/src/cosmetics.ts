/** Display metadata for cosmetics (unlock rules live in the learning engine). */
export const COSMETIC_ICONS: Record<string, string> = {
  'sprout-bloom': '✿',
  scarf: '〰',
  hachimaki: '帯',
  glasses: '◎',
  sakura: '桜',
  'grad-cap': '帽',
  lantern: '灯',
  'star-crown': '★',
};

/** Short, kind character lines. Japanese with optional translation. */
export interface CharacterLine {
  ja: string;
  en: string;
}

export const LINES: Record<'greet' | 'prompt' | 'correct' | 'incorrect' | 'done' | 'goal' | 'sleepy' | 'welcome-back' | 'levelup', CharacterLine[]> = {
  greet: [
    { ja: 'こんにちは！', en: 'Hello!' },
    { ja: 'いっしょにべんきょうしよう！', en: "Let's study together!" },
  ],
  prompt: [
    { ja: 'ちょっとだけ、どう？', en: 'Just a quick one?' },
    { ja: 'ふくしゅうのじかんだよ。', en: "It's review time." },
    { ja: '二分だけ、いい？', en: 'Got two minutes?' },
  ],
  correct: [
    { ja: 'すごい！', en: 'Amazing!' },
    { ja: 'せいかい！', en: 'Correct!' },
    { ja: 'いいね！', en: 'Nice!' },
  ],
  incorrect: [
    { ja: 'だいじょうぶ！', en: "It's okay!" },
    { ja: 'つぎはできるよ。', en: "You'll get it next time." },
    { ja: 'いっしょにおぼえよう。', en: "Let's learn it together." },
  ],
  done: [
    { ja: 'おつかれさま！', en: 'Good work!' },
    { ja: 'またあとでね。', en: 'See you later.' },
  ],
  goal: [{ ja: 'きょうのもくひょう、たっせい！', en: "Today's goal: complete!" }],
  sleepy: [{ ja: 'ふわぁ…', en: '*yawn*' }],
  'welcome-back': [{ ja: 'おかえり！', en: 'Welcome back!' }],
  levelup: [{ ja: 'レベルアップ！', en: 'Level up!' }],
};

export function lineFor(kind: keyof typeof LINES, seed: number): CharacterLine {
  const list = LINES[kind];
  return list[Math.abs(seed) % list.length] as CharacterLine;
}
