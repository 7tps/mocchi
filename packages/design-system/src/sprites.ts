import type { CharacterMood } from '@jc/shared-types';

/**
 * Mocchi — an original pixel-art companion: a round mochi spirit with a mint
 * sprout. Every frame is generated from the same body model on a 32×32 grid
 * with one limited palette, so all expressions, animations and cosmetics stay
 * consistent. Real hand-drawn sheets can replace the generated PNGs under
 * assets/character without changing any app code (see docs/character.md).
 */

export const SPRITE_SIZE = 32;

/** Palette index 0 is transparent. Colours are RGBA hex. */
export const PALETTE: string[] = [
  '#00000000', // 0 transparent
  '#1b2238ff', // 1 outline / eyes (deep navy)
  '#f6eedcff', // 2 body (mochi cream)
  '#dccdb0ff', // 3 body shade
  '#f2a5a0ff', // 4 cheeks
  '#7fd3a8ff', // 5 sprout mint
  '#3f9b78ff', // 6 sprout dark
  '#ffffffff', // 7 highlight
  '#4fb3a9ff', // 8 teal accent
  '#e06b5fff', // 9 coral red
  '#f3c969ff', // 10 gold
  '#f6b8c8ff', // 11 sakura pink
  '#8a6a4fff', // 12 wood brown
  '#6d8fd6ff', // 13 sky blue
  '#2a3354ff', // 14 navy light (shadow on accessories)
];

export const C = {
  clear: 0, ink: 1, body: 2, shade: 3, cheek: 4, mint: 5, leaf: 6, white: 7, teal: 8, red: 9, gold: 10, pink: 11, wood: 12, blue: 13, navy: 14,
} as const;

export const MOODS: CharacterMood[] = [
  'idle', 'blink', 'happy', 'thinking', 'curious', 'confused', 'sleepy', 'celebrating', 'encouraging', 'studying', 'waiting',
];

type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'sleepy' | 'up' | 'down' | 'left' | 'right';
type Mouth = 'smile' | 'open' | 'flat' | 'wavy' | 'o' | 'grin';
type Extra = 'sparkle' | 'dots1' | 'dots2' | 'dots3' | 'question' | 'bang' | 'sweat' | 'z1' | 'z2' | 'confetti1' | 'confetti2' | 'heart' | 'book' | 'bookFlip' | 'armsUp' | 'armWave';

interface FrameSpec {
  dy: number;
  squash: number;
  eyes: Eyes;
  mouth: Mouth;
  extras: Extra[];
  blush?: boolean;
}

interface Animation {
  frames: FrameSpec[];
  frameMs: number;
  loop: boolean;
}

const f = (dy: number, squash: number, eyes: Eyes, mouth: Mouth, extras: Extra[] = [], blush = true): FrameSpec => ({ dy, squash, eyes, mouth, extras, blush });

export const ANIMATIONS: Record<CharacterMood, Animation> = {
  idle: { frameMs: 320, loop: true, frames: [f(0, 0, 'open', 'smile'), f(0, 1, 'open', 'smile'), f(-1, 0, 'open', 'smile'), f(0, 0, 'open', 'smile')] },
  blink: { frameMs: 90, loop: false, frames: [f(0, 0, 'closed', 'smile'), f(0, 0, 'open', 'smile')] },
  happy: { frameMs: 160, loop: true, frames: [f(0, 1, 'happy', 'grin', ['sparkle']), f(-2, -1, 'happy', 'grin'), f(-3, -1, 'happy', 'grin', ['sparkle']), f(-1, 0, 'happy', 'grin')] },
  thinking: { frameMs: 380, loop: true, frames: [f(0, 0, 'up', 'flat', ['dots1']), f(0, 0, 'up', 'flat', ['dots2']), f(0, 0, 'up', 'flat', ['dots3']), f(0, 1, 'up', 'flat', ['dots3'])] },
  curious: { frameMs: 260, loop: true, frames: [f(0, 0, 'wide', 'o', ['bang']), f(-1, -1, 'wide', 'o', ['bang']), f(0, 0, 'wide', 'o'), f(0, 0, 'wide', 'o', ['bang'])] },
  confused: { frameMs: 300, loop: true, frames: [f(0, 0, 'open', 'wavy', ['question', 'sweat']), f(0, 1, 'open', 'wavy', ['question']), f(0, 0, 'left', 'wavy', ['question', 'sweat']), f(0, 0, 'right', 'wavy', ['question'])] },
  sleepy: { frameMs: 520, loop: true, frames: [f(0, 1, 'sleepy', 'o', ['z1'], false), f(0, 2, 'sleepy', 'o', ['z1'], false), f(0, 1, 'sleepy', 'o', ['z2'], false), f(0, 0, 'sleepy', 'o', ['z2'], false)] },
  celebrating: { frameMs: 140, loop: true, frames: [f(0, 2, 'happy', 'open', ['confetti1']), f(-4, -2, 'happy', 'open', ['armsUp', 'confetti2']), f(-5, -2, 'happy', 'open', ['armsUp', 'confetti1']), f(-2, 0, 'happy', 'open', ['confetti2'])] },
  encouraging: { frameMs: 240, loop: true, frames: [f(0, 0, 'happy', 'smile', ['heart']), f(-1, 0, 'happy', 'smile', ['armWave', 'heart']), f(0, 1, 'happy', 'smile', ['armWave']), f(0, 0, 'happy', 'smile', ['heart'])] },
  studying: { frameMs: 420, loop: true, frames: [f(0, 0, 'down', 'flat', ['book']), f(0, 1, 'down', 'flat', ['book']), f(0, 0, 'down', 'smile', ['bookFlip']), f(0, 0, 'down', 'flat', ['book'])] },
  waiting: { frameMs: 360, loop: true, frames: [f(0, 0, 'left', 'smile', ['dots1']), f(0, 0, 'open', 'smile', ['dots2']), f(0, 1, 'right', 'smile', ['dots3']), f(0, 0, 'open', 'smile', ['dots3'])] },
};

export type Frame = Uint8Array; // SPRITE_SIZE * SPRITE_SIZE palette indices

interface Body {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  top: number;
  bottom: number;
}

function set(fr: Frame, x: number, y: number, c: number): void {
  if (x < 0 || y < 0 || x >= SPRITE_SIZE || y >= SPRITE_SIZE) return;
  fr[y * SPRITE_SIZE + x] = c;
}

function get(fr: Frame, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= SPRITE_SIZE || y >= SPRITE_SIZE) return 0;
  return fr[y * SPRITE_SIZE + x] ?? 0;
}

function pixels(fr: Frame, ox: number, oy: number, rows: string[], map: Record<string, number>): void {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = map[ch];
      if (c !== undefined) set(fr, ox + x, oy + y, c);
    });
  });
}

function drawBody(fr: Frame, spec: FrameSpec): Body {
  const ground = 29;
  const rx = 11 + spec.squash * 0.6;
  const ry = 9 - spec.squash * 0.6;
  const cx = 15.5;
  const bottom = ground + Math.min(0, spec.dy);
  const cy = bottom - ry;
  const inside = (x: number, y: number) => {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / (y + 0.5 > cy ? ry * 0.92 : ry);
    return dx * dx + dy * dy <= 1 && y + 0.5 <= bottom;
  };
  let top = SPRITE_SIZE;
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (!inside(x, y)) continue;
      top = Math.min(top, y);
      // Soft shading: lower-right crescent.
      const sx = (x + 0.5 - (cx - 2.5)) / rx;
      const sy = (y + 0.5 - (cy - 2.5)) / ry;
      set(fr, x, y, sx * sx + sy * sy > 1.02 ? C.shade : C.body);
    }
  }
  // Outline any body pixel touching the outside.
  const copy = fr.slice();
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (!copy[y * SPRITE_SIZE + x]) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => !get(copy, x + (ax as number), y + (ay as number)));
      if (edge) set(fr, x, y, C.ink);
    }
  }
  // Highlight
  set(fr, Math.round(cx - rx * 0.55), Math.round(cy - ry * 0.45), C.white);
  set(fr, Math.round(cx - rx * 0.55) + 1, Math.round(cy - ry * 0.45) - 1, C.white);
  // Ground shadow when airborne
  if (spec.dy < 0) {
    for (let x = 9; x <= 22; x++) set(fr, x, 30, C.navy);
  }
  return { cx, cy, rx, ry, top, bottom };
}

function drawSprout(fr: Frame, b: Body, cosmetic: string | null): void {
  const x = Math.round(b.cx);
  const y = b.top;
  if (cosmetic === 'grad-cap' || cosmetic === 'star-crown') return;
  set(fr, x, y - 1, C.leaf);
  set(fr, x, y - 2, C.leaf);
  pixels(fr, x - 4, y - 5, ['.MM...', 'MMMd..', '.MMd..'], { M: C.mint, d: C.leaf });
  pixels(fr, x + 1, y - 6, ['..MM.', '.MMMM', 'dMMM.', 'dd...'], { M: C.mint, d: C.leaf });
  if (cosmetic === 'sprout-bloom') pixels(fr, x + 2, y - 9, ['.P.', 'PYP', '.P.'], { P: C.pink, Y: C.gold });
}

function eyeAt(fr: Frame, x: number, y: number, kind: Eyes): void {
  const I = C.ink;
  const W = C.white;
  switch (kind) {
    case 'open':
      pixels(fr, x, y, ['II', 'WI', 'II'], { I, W });
      break;
    case 'wide':
      pixels(fr, x - 1, y - 1, ['.II.', 'IWII', 'IIII', '.II.'], { I, W });
      break;
    case 'closed':
      pixels(fr, x - 1, y + 1, ['IIII'], { I });
      break;
    case 'happy':
      pixels(fr, x - 1, y, ['.II.', 'I..I'], { I });
      break;
    case 'sleepy':
      pixels(fr, x - 1, y + 1, ['IIII', '.II.'], { I });
      break;
    case 'up':
      pixels(fr, x, y - 1, ['WI', 'II', '..'], { I, W });
      break;
    case 'down':
      pixels(fr, x, y + 1, ['II', 'II'], { I });
      break;
    case 'left':
      pixels(fr, x - 1, y, ['II', 'IW', 'II'], { I, W });
      break;
    case 'right':
      pixels(fr, x + 1, y, ['II', 'WI', 'II'], { I, W });
      break;
  }
}

function drawFace(fr: Frame, b: Body, spec: FrameSpec): void {
  const ey = Math.round(b.cy - 2);
  const lx = Math.round(b.cx - 5);
  const rx = Math.round(b.cx + 4);
  eyeAt(fr, lx, ey, spec.eyes);
  eyeAt(fr, rx, ey, spec.eyes);
  if (spec.blush) {
    set(fr, lx - 2, ey + 3, C.cheek);
    set(fr, lx - 1, ey + 3, C.cheek);
    set(fr, rx + 2, ey + 3, C.cheek);
    set(fr, rx + 3, ey + 3, C.cheek);
  }
  const mx = Math.round(b.cx) - 1;
  const my = ey + 4;
  const I = C.ink;
  const R = C.red;
  switch (spec.mouth) {
    case 'smile': pixels(fr, mx - 1, my, ['I..I', '.II.'], { I }); break;
    case 'grin': pixels(fr, mx - 1, my, ['IIII', '.RR.'], { I, R }); break;
    case 'open': pixels(fr, mx - 1, my, ['IIII', 'IRRI', '.II.'], { I, R }); break;
    case 'flat': pixels(fr, mx, my + 1, ['II'], { I }); break;
    case 'wavy': pixels(fr, mx - 1, my, ['.I.I', 'I.I.'], { I }); break;
    case 'o': pixels(fr, mx, my, ['II', 'II'], { I }); break;
  }
}

function drawExtras(fr: Frame, b: Body, extras: Extra[]): void {
  const top = b.top;
  const left = Math.round(b.cx - b.rx);
  const right = Math.round(b.cx + b.rx);
  const G = C.gold;
  const I = C.ink;
  for (const e of extras) {
    switch (e) {
      case 'sparkle': pixels(fr, right - 1, top - 2, ['.G.', 'GWG', '.G.'], { G, W: C.white }); break;
      case 'dots1': pixels(fr, right - 2, top - 3, ['T'], { T: C.teal }); break;
      case 'dots2': pixels(fr, right - 2, top - 3, ['T.T'], { T: C.teal }); break;
      case 'dots3': pixels(fr, right - 2, top - 3, ['T.T.T'], { T: C.teal }); break;
      case 'question': pixels(fr, right - 1, top - 7, ['.TTT.', 'T...T', '...T.', '..T..', '.....', '..T..'], { T: C.teal }); break;
      case 'bang': pixels(fr, right, top - 6, ['G', 'G', 'G', '.', 'G'], { G }); break;
      case 'sweat': pixels(fr, left + 1, Math.round(b.cy - 6), ['.B', 'BB', 'BB'], { B: C.blue }); break;
      case 'z1': pixels(fr, right - 2, top - 4, ['BBB', '.B.', 'BBB'], { B: C.blue }); break;
      case 'z2': pixels(fr, right, top - 8, ['BBBB', '..B.', '.B..', 'BBBB'], { B: C.blue }); pixels(fr, right - 3, top - 2, ['BB', 'BB'], { B: C.blue }); break;
      case 'confetti1':
        for (const [x, y, c] of [[3, 4, C.pink], [27, 6, C.gold], [6, 12, C.teal], [25, 13, C.pink], [11, 2, C.gold], [21, 3, C.teal]] as const) set(fr, x, y, c);
        break;
      case 'confetti2':
        for (const [x, y, c] of [[4, 7, C.gold], [26, 3, C.teal], [8, 15, C.pink], [24, 10, C.gold], [13, 5, C.teal], [19, 1, C.pink]] as const) set(fr, x, y, c);
        break;
      case 'heart': pixels(fr, right - 1, top - 4, ['P.P', 'PPP', '.P.'], { P: C.pink }); break;
      case 'armsUp':
        pixels(fr, left - 2, Math.round(b.cy - 4), ['I.', 'BI', 'BI'], { I, B: C.body });
        pixels(fr, right + 1, Math.round(b.cy - 4), ['.I', 'IB', 'IB'], { I, B: C.body });
        break;
      case 'armWave': pixels(fr, right, Math.round(b.cy - 3), ['.II', 'IBI', 'II.'], { I, B: C.body }); break;
      case 'book':
      case 'bookFlip': {
        const by = Math.round(b.cy + 4);
        const bx = Math.round(b.cx) - 5;
        pixels(fr, bx, by, e === 'book'
          ? ['IIIIIIIIII', 'IWWWWIWWWI', 'IWTTWIWTWI', 'IWWWWIWWWI', 'IIIIIIIIII']
          : ['IIIIIIIIII', 'IWWWWIIWWI', 'IWTTWIWWTI', 'IWWWWIWWWI', 'IIIIIIIIII'], { I, W: C.white, T: C.teal });
        break;
      }
    }
  }
}

function drawCosmetic(fr: Frame, b: Body, cosmetic: string | null): void {
  if (!cosmetic) return;
  const x = Math.round(b.cx);
  const top = b.top;
  const ey = Math.round(b.cy - 2);
  const I = C.ink;
  switch (cosmetic) {
    case 'scarf': {
      const y = Math.round(b.cy + 3);
      for (let i = Math.round(b.cx - b.rx + 2); i <= Math.round(b.cx + b.rx - 2); i++) {
        if (get(fr, i, y) && get(fr, i, y) !== C.ink) set(fr, i, y, C.teal);
        if (get(fr, i, y + 1) && get(fr, i, y + 1) !== C.ink) set(fr, i, y + 1, i % 3 === 0 ? C.mint : C.teal);
      }
      pixels(fr, x + 5, y + 2, ['TT', 'TM', '.T'], { T: C.teal, M: C.mint });
      break;
    }
    case 'hachimaki': {
      const y = top + 2;
      for (let i = 0; i < SPRITE_SIZE; i++) if (get(fr, i, y) === C.body || get(fr, i, y) === C.shade) set(fr, i, y, C.red);
      pixels(fr, Math.round(b.cx + b.rx) - 2, y - 1, ['.RR', 'RR.', '.RR'], { R: C.red });
      set(fr, x, y, C.white);
      break;
    }
    case 'glasses': {
      const lx = Math.round(b.cx - 5);
      const rx = Math.round(b.cx + 4);
      for (const ex of [lx, rx]) pixels(fr, ex - 2, ey - 1, ['.WWWW.', 'W....W', 'W....W', '.WWWW.'], { W: C.wood });
      pixels(fr, lx + 4, ey, ['WWW'], { W: C.wood });
      break;
    }
    case 'sakura':
      pixels(fr, Math.round(b.cx - b.rx) + 2, top, ['.P.', 'PYP', '.P.'], { P: C.pink, Y: C.gold });
      break;
    case 'grad-cap':
      pixels(fr, x - 8, top - 6, [
        '.......WW.......',
        '....WWWNNWWW....',
        '.WWWNNNNNNNNWWW.',
        'IIIINNNNNNNNIIIG',
        '...INNNNNNNNI..G',
        '....IIIIIIII..GG',
      ], { I, N: C.navy, W: C.white, G: C.gold });
      break;
    case 'lantern':
      pixels(fr, Math.round(b.cx + b.rx) - 2, Math.round(b.cy) - 4, [
        '..I..',
        '.III.',
        'IRRRI',
        'RGGGR',
        'RRRRR',
        'RGGGR',
        'IRRRI',
        '.III.',
      ], { I, R: C.red, G: C.gold });
      break;
    case 'star-crown':
      pixels(fr, x - 5, top - 4, ['G...G...G..', 'GG.GGG.GG..', 'GGGGGGGGG..', 'GPGGWGGPG..'], { G: C.gold, P: C.pink, W: C.white });
      break;
    default:
      break;
  }
}

/** Render one frame of a mood (optionally with a cosmetic) to palette indices. */
export function renderFrame(mood: CharacterMood, index: number, cosmetic: string | null = null): Frame {
  const anim = ANIMATIONS[mood];
  const spec = anim.frames[index % anim.frames.length] as FrameSpec;
  const fr: Frame = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE);
  const body = drawBody(fr, spec);
  drawSprout(fr, body, cosmetic);
  drawFace(fr, body, spec);
  drawCosmetic(fr, body, cosmetic);
  drawExtras(fr, body, spec.extras);
  return fr;
}

export function frameCount(mood: CharacterMood): number {
  return ANIMATIONS[mood].frames.length;
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255];
}

/** RGBA pixel buffer for a frame (used by canvas renderers and the PNG exporter). */
export function frameToRgba(fr: Frame, scale = 1): Uint8ClampedArray<ArrayBuffer> {
  const size = SPRITE_SIZE * scale;
  const out = new Uint8ClampedArray(size * size * 4);
  const colors = PALETTE.map(hexToRgba);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = colors[fr[Math.floor(y / scale) * SPRITE_SIZE + Math.floor(x / scale)] ?? 0] ?? [0, 0, 0, 0];
      const o = (y * size + x) * 4;
      out[o] = c[0];
      out[o + 1] = c[1];
      out[o + 2] = c[2];
      out[o + 3] = c[3];
    }
  }
  return out;
}

/** Map learning events to character moods. */
export function moodFor(event: 'correct' | 'incorrect' | 'session-complete' | 'goal-complete' | 'idle-long' | 'question' | 'prompt' | 'level-up'): CharacterMood {
  switch (event) {
    case 'correct': return 'happy';
    case 'incorrect': return 'encouraging';
    case 'session-complete': return 'celebrating';
    case 'goal-complete': return 'celebrating';
    case 'idle-long': return 'sleepy';
    case 'question': return 'thinking';
    case 'prompt': return 'curious';
    case 'level-up': return 'celebrating';
  }
}
