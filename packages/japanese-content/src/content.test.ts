import { describe, expect, it } from 'vitest';
import { getLibrary, validateItems, conjugate, conjugationDistractors, importContentPack, extendLibrary, canConjugate, VERB_FORMS } from './index';

describe('bundled curriculum', () => {
  const lib = getLibrary();

  it('contains a meaningful starter dataset', () => {
    const count = (type: string) => lib.items.filter((i) => i.type === type).length;
    expect(count('vocab')).toBeGreaterThanOrEqual(300);
    expect(count('kana')).toBeGreaterThanOrEqual(190);
    expect(count('kanji')).toBeGreaterThanOrEqual(100);
    expect(count('grammar')).toBeGreaterThanOrEqual(30);
    expect(count('particle')).toBeGreaterThanOrEqual(10);
    expect(count('expression')).toBeGreaterThanOrEqual(25);
    expect(count('reading')).toBeGreaterThanOrEqual(5);
  });

  it('passes validation with no issues', () => {
    expect(validateItems(lib.items)).toEqual([]);
  });

  it('keeps every item attributed', () => {
    for (const item of lib.items) expect(item.source.license).toBeTruthy();
  });

  it('uses each vocabulary word in its own example sentence', () => {
    for (const item of lib.items.filter((i) => i.type === 'vocab')) {
      const pos = item.partOfSpeech;
      const stem = item.ja === 'する' ? 'し' : pos?.startsWith('verb-') && pos !== 'verb-suru' ? item.ja.slice(0, -1) : pos === 'adj-i' ? item.ja.slice(0, -1) : item.ja;
      expect(item.examples[0]?.ja, item.id).toContain(stem.length ? stem : item.ja);
    }
  });

  it('spans difficulties from beginner to advanced for placement', () => {
    const ds = lib.items.map((i) => i.difficulty);
    expect(Math.min(...ds)).toBeLessThan(0.5);
    expect(Math.max(...ds)).toBeGreaterThan(8.5);
  });

  it('distinguishes homophones by id', () => {
    expect(lib.byId.get('v:易しい')?.meanings[0]).toBe('easy');
    expect(lib.byId.get('v:優しい')?.meanings[0]).toBe('kind');
  });
});

describe('conjugation engine', () => {
  const cases: Array<[string, string, Parameters<typeof conjugate>[2], Parameters<typeof conjugate>[3], string, string]> = [
    ['飲む', 'のむ', 'verb-godan', 'te', '飲んで', 'のんで'],
    ['書く', 'かく', 'verb-godan', 'te', '書いて', 'かいて'],
    ['泳ぐ', 'およぐ', 'verb-godan', 'ta', '泳いだ', 'およいだ'],
    ['話す', 'はなす', 'verb-godan', 'te', '話して', 'はなして'],
    ['待つ', 'まつ', 'verb-godan', 'ta', '待った', 'まった'],
    ['買う', 'かう', 'verb-godan', 'nai', '買わない', 'かわない'],
    ['行く', 'いく', 'verb-godan', 'te', '行って', 'いって'],
    ['行く', 'いく', 'verb-godan', 'ta', '行った', 'いった'],
    ['帰る', 'かえる', 'verb-godan', 'masu', '帰ります', 'かえります'],
    ['ある', 'ある', 'verb-godan', 'nai', 'ない', 'ない'],
    ['書く', 'かく', 'verb-godan', 'potential', '書ける', 'かける'],
    ['読む', 'よむ', 'verb-godan', 'volitional', '読もう', 'よもう'],
    ['食べる', 'たべる', 'verb-ichidan', 'te', '食べて', 'たべて'],
    ['見る', 'みる', 'verb-ichidan', 'potential', '見られる', 'みられる'],
    ['勉強', 'べんきょう', 'verb-suru', 'masu', '勉強します', 'べんきょうします'],
    ['する', 'する', 'verb-suru', 'potential', 'できる', 'できる'],
    ['来る', 'くる', 'verb-kuru', 'nai', '来ない', 'こない'],
    ['来る', 'くる', 'verb-kuru', 'te', '来て', 'きて'],
    ['高い', 'たかい', 'adj-i', 'adj-past', '高かった', 'たかかった'],
    ['いい', 'いい', 'adj-i', 'adj-negative', 'よくない', 'よくない'],
    ['静か', 'しずか', 'adj-na', 'adj-negative', '静かじゃない', 'しずかじゃない'],
  ];
  it.each(cases)('%s (%s) → %s', (ja, reading, pos, form, expJa, expReading) => {
    expect(conjugate(ja, reading, pos, form)).toEqual({ ja: expJa, reading: expReading });
  });

  it('produces distractors that never include the right answer', () => {
    for (const item of getLibrary().items.filter((i) => i.type === 'vocab')) {
      for (const form of VERB_FORMS) {
        if (!canConjugate(item.partOfSpeech, form) || !item.partOfSpeech) continue;
        const right = conjugate(item.ja, item.reading, item.partOfSpeech, form).ja;
        const wrong = conjugationDistractors(item.ja, item.reading, item.partOfSpeech, form);
        expect(wrong, `${item.ja} ${form}`).not.toContain(right);
        expect(wrong.length, `${item.ja} ${form}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('content pack import', () => {
  const pack = {
    format: 'jc-content-pack',
    version: 1,
    name: 'Test pack',
    source: { id: 'test', license: 'CC BY-SA 4.0', attribution: 'Test attribution' },
    items: [
      {
        id: 'tsukue2', type: 'vocab', ja: '机', reading: 'つくえ', meanings: ['desk'], partOfSpeech: 'noun',
        examples: [{ ja: '机があります。', reading: 'つくえがあります。', en: 'There is a desk.' }],
        difficulty: 1.5, skills: ['vocabulary'], tags: [], order: 0, importance: 0.5,
      },
      {
        id: 'bad', type: 'vocab', ja: '犬', reading: 'dog', meanings: ['dog'],
        examples: [], difficulty: 1, skills: ['vocabulary'], tags: [], order: 1, importance: 0.5,
      },
    ],
  };

  it('accepts valid items, rejects invalid ones and attaches attribution', () => {
    const result = importContentPack(pack);
    expect(result.items.map((i) => i.id)).toEqual(['x:test:tsukue2']);
    expect(result.items[0]?.source.attribution).toBe('Test attribution');
    expect(result.issues.some((i) => i.itemId === 'x:test:bad')).toBe(true);
    const lib = extendLibrary(getLibrary(), result.items);
    expect(lib.byId.has('x:test:tsukue2')).toBe(true);
  });

  it('rejects malformed packs', () => {
    expect(importContentPack({ format: 'nope' }).items).toEqual([]);
  });
});

describe('wrong-answer notes', () => {
  it('explain every distractor in grammar and particle exercises', async () => {
    const { whyNotFor } = await import('./index');
    const missing: string[] = [];
    for (const item of getLibrary().items) {
      if (item.type !== 'grammar' && item.type !== 'particle') continue;
      for (const e of item.exercises ?? []) {
        if (e.kind !== 'fill-blank' && e.kind !== 'choose-sentence') continue;
        for (const d of e.distractors ?? []) if (!whyNotFor(e.id, d)) missing.push(`${e.id}: ${d}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives a reason for every conjugation mistake', async () => {
    const { conjugationMistakes } = await import('./index');
    for (const item of getLibrary().items.filter((i) => i.type === 'vocab' && i.partOfSpeech)) {
      for (const form of [...VERB_FORMS, 'adj-negative', 'adj-past'] as const) {
        if (!canConjugate(item.partOfSpeech, form)) continue;
        for (const m of conjugationMistakes(item.ja, item.reading, item.partOfSpeech!, form)) expect(m.why.length, `${item.ja} ${form} ${m.text}`).toBeGreaterThan(10);
      }
    }
  });
});
