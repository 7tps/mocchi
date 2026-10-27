import type { ExampleSentence, JlptBand, LearningItem, PartOfSpeech, Skill, SourceInfo } from '@jc/shared-types';
import { kanaToRomaji, toKatakana } from '@jc/shared-utils';
import { VOCAB_SOURCE } from './data/vocab';
import { KANJI_SOURCE } from './data/kanji';
import { EXPRESSIONS_SOURCE } from './data/expressions';
import { HIRAGANA_ROWS, KATAKANA_EXTRA } from './data/kana';
import { GRAMMAR } from './data/grammar';
import { PARTICLES } from './data/particles';
import { READINGS } from './data/readings';
import { FORM_INFO, VERB_FORMS, ADJ_FORMS, type ConjugationForm } from './conjugate';

export const CURATED_SOURCE: SourceInfo = {
  id: 'jc-curated',
  license: 'MIT (original content of this project)',
  attribution: 'Written for the Japanese Companion starter curriculum.',
};

const POS: Record<string, PartOfSpeech> = {
  n: 'noun', pn: 'pronoun', v5: 'verb-godan', v1: 'verb-ichidan', vs: 'verb-suru', vk: 'verb-kuru',
  ai: 'adj-i', an: 'adj-na', adv: 'adverb', conj: 'conjunction', exp: 'expression', int: 'interjection',
};

/** Difficulty ranges per JLPT band on the engine's 0–10 scale. */
export const BAND_RANGES: Record<JlptBand, [number, number]> = {
  N5: [1.0, 3.0],
  N4: [3.0, 4.8],
  N3: [5.0, 6.4],
  N2: [6.6, 7.8],
  N1: [8.2, 9.4],
};

/** Kanji difficulty ranges per JLPT band. */
export const KANJI_RANGES: Record<JlptBand, [number, number]> = {
  N5: [1.6, 3.4],
  N4: [3.4, 4.9],
  N3: [5.4, 6.2],
  N2: [7.0, 7.6],
  N1: [8.4, 9.2],
};

function spread(range: [number, number], index: number, count: number): number {
  const t = count <= 1 ? 0 : index / (count - 1);
  return Math.round((range[0] + (range[1] - range[0]) * t) * 100) / 100;
}

/** Default importance per JLPT band. */
export const IMPORTANCE: Record<JlptBand, number> = { N5: 1, N4: 0.85, N3: 0.7, N2: 0.55, N1: 0.45 };

function lines(source: string): string[][] {
  return source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .map((l) => l.split('|').map((f) => f.trim()));
}

export class ContentParseError extends Error {}

function buildVocab(): LearningItem[] {
  const rows = lines(VOCAB_SOURCE);
  const byBand = new Map<JlptBand, number>();
  const bandCounts = new Map<JlptBand, number>();
  for (const r of rows) bandCounts.set(r[4] as JlptBand, (bandCounts.get(r[4] as JlptBand) ?? 0) + 1);
  return rows.map((r, idx) => {
    if (r.length < 9) throw new ContentParseError(`Vocab line ${idx + 1} has ${r.length} fields: ${r.join('|')}`);
    const [ja, reading, meanings, pos, band, tags, exJa, exReading, exEn, note] = r as [
      string, string, string, string, JlptBand, string, string, string, string, string | undefined,
    ];
    const partOfSpeech = POS[pos];
    if (!partOfSpeech) throw new ContentParseError(`Unknown part of speech "${pos}" for ${ja}`);
    const i = byBand.get(band) ?? 0;
    byBand.set(band, i + 1);
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const skills: Skill[] = ['vocabulary'];
    if (tagList.includes('loanword')) skills.push('katakana');
    return {
      id: `v:${ja}`,
      type: 'vocab',
      ja,
      reading,
      romaji: kanaToRomaji(reading),
      meanings: meanings.split(';').map((m) => m.trim()).filter(Boolean),
      partOfSpeech,
      examples: [{ ja: exJa, reading: exReading, en: exEn }],
      difficulty: spread(BAND_RANGES[band] ?? [5, 5], i, bandCounts.get(band) ?? 1),
      jlpt: band,
      skills,
      tags: tagList,
      order: idx,
      importance: IMPORTANCE[band] ?? 0.5,
      notes: note || undefined,
      source: CURATED_SOURCE,
    } satisfies LearningItem;
  });
}

function buildKana(): LearningItem[] {
  const items: LearningItem[] = [];
  let order = 0;
  for (const row of HIRAGANA_ROWS) {
    for (const [kana, romaji] of row.chars) {
      items.push(kanaItem(kana, romaji, 'hiragana', row.difficulty, row.label, order++));
    }
  }
  for (const row of HIRAGANA_ROWS) {
    for (const [kana, romaji] of row.chars) {
      items.push(kanaItem(toKatakana(kana), romaji, 'katakana', row.difficulty + 0.6, row.label.replace(/[ぁ-ゖ]/g, (c) => toKatakana(c)), order++));
    }
  }
  for (const [kana, romaji] of KATAKANA_EXTRA) items.push(kanaItem(kana, romaji, 'katakana', 2.6, 'Loanword sounds', order++));
  return items;
}

function kanaItem(kana: string, romaji: string, script: 'hiragana' | 'katakana', difficulty: number, row: string, order: number): LearningItem {
  return {
    id: `kana:${kana}`,
    type: 'kana',
    ja: kana,
    reading: kana,
    romaji,
    meanings: [romaji],
    examples: [],
    difficulty: Math.round(difficulty * 100) / 100,
    skills: [script],
    tags: [script, row],
    order,
    importance: 1,
    notes: kana === 'を' || kana === 'ヲ' ? 'Pronounced "o"; used almost only as the object particle.' : kana === 'ぢ' || kana === 'づ' ? 'Rare; usually じ and ず are used instead.' : undefined,
    source: CURATED_SOURCE,
  };
}

function buildKanji(vocab: LearningItem[]): LearningItem[] {
  const rows = lines(KANJI_SOURCE);
  const counts = new Map<JlptBand, number>();
  for (const r of rows) counts.set(r[5] as JlptBand, (counts.get(r[5] as JlptBand) ?? 0) + 1);
  const seen = new Map<JlptBand, number>();
  return rows.map((r, idx) => {
    if (r.length < 7) throw new ContentParseError(`Kanji line ${idx + 1} has ${r.length} fields`);
    const [ch, primary, on, kun, meanings, band, compounds, note] = r as [
      string, string, string, string, string, JlptBand, string, string, string | undefined,
    ];
    const i = seen.get(band) ?? 0;
    seen.set(band, i + 1);
    const compoundList = compounds
      .split(',')
      .map((c) => c.split(':'))
      .filter((c) => c.length === 3)
      .map(([w, rd, m]) => ({ word: w as string, reading: rd as string, meaning: m as string }));
    const examples: ExampleSentence[] = [];
    const relatedVocab: string[] = [];
    for (const c of compoundList) {
      const match = vocab.find((v) => v.ja === c.word);
      if (match) {
        relatedVocab.push(match.id);
        if (examples.length < 2 && match.examples[0]) examples.push(match.examples[0]);
      }
    }
    return {
      id: `k:${ch}`,
      type: 'kanji',
      ja: ch,
      reading: primary,
      meanings: meanings.split(';').map((m) => m.trim()).filter(Boolean),
      onyomi: on ? on.split(',').filter(Boolean) : [],
      kunyomi: kun ? kun.split(',').filter(Boolean) : [],
      examples,
      relatedVocab,
      // Compounds are stored as exercises so they keep reading + meaning together.
      exercises: compoundList.map((c, n) => ({
        id: `k:${ch}:${n}`,
        kind: 'fill-blank' as const,
        prompt: c.word,
        promptReading: c.reading,
        promptEn: c.meaning,
        answer: c.reading,
        explanation: `${c.word} (${c.reading}) — ${c.meaning}`,
      })),
      difficulty: spread(KANJI_RANGES[band] ?? [5, 5], i, counts.get(band) ?? 1),
      jlpt: band,
      skills: ['kanji'],
      tags: ['kanji'],
      order: idx,
      importance: IMPORTANCE[band] ?? 0.5,
      notes: note || undefined,
      source: CURATED_SOURCE,
    } satisfies LearningItem;
  });
}

function buildExpressions(): LearningItem[] {
  return lines(EXPRESSIONS_SOURCE).map((r, idx) => {
    const [ja, reading, meanings, band, usage, exJa, exReading, exEn] = r as [
      string, string, string, JlptBand, string, string, string, string,
    ];
    return {
      id: `e:${ja}`,
      type: 'expression',
      ja,
      reading,
      romaji: kanaToRomaji(reading),
      meanings: meanings.split(';').map((m) => m.trim()).filter(Boolean),
      partOfSpeech: 'expression',
      examples: [{ ja: exJa, reading: exReading, en: exEn }],
      difficulty: band === 'N5' ? 1.2 + idx * 0.04 : 3.2 + idx * 0.02,
      jlpt: band,
      skills: ['expressions'],
      tags: ['expression'],
      order: idx,
      importance: 0.9,
      notes: usage,
      source: CURATED_SOURCE,
    } satisfies LearningItem;
  });
}

function buildGrammar(): LearningItem[] {
  return GRAMMAR.map((g, idx) => ({
    id: `g:${g.id}`,
    type: 'grammar',
    ja: g.pattern,
    reading: g.reading ?? '',
    meanings: [g.meaning],
    examples: g.examples,
    difficulty: g.difficulty,
    jlpt: g.jlpt,
    skills: ['grammar'],
    tags: ['grammar'],
    order: idx,
    importance: IMPORTANCE[g.jlpt],
    notes: g.notes,
    formation: g.formation,
    commonMistakes: g.mistakes,
    confusedWith: g.confusedWith?.map((c) => `g:${c}`),
    exercises: g.exercises.map((e) => ({ ...e, difficulty: e.difficulty ?? g.difficulty })),
    source: CURATED_SOURCE,
  }));
}

function buildParticles(): LearningItem[] {
  return PARTICLES.map((p, idx) => ({
    id: `p:${p.id}`,
    type: 'particle',
    ja: p.particle,
    reading: p.reading,
    meanings: [p.meaning],
    examples: [],
    difficulty: p.difficulty,
    jlpt: p.jlpt,
    skills: ['particles'],
    tags: ['particle'],
    order: idx,
    importance: 1,
    notes: p.notes,
    exercises: p.drills.map((d) => ({ ...d, difficulty: d.difficulty ?? p.difficulty })),
    source: CURATED_SOURCE,
  }));
}

function buildReadings(): LearningItem[] {
  return READINGS.map((r, idx) => ({
    id: `r:${r.id}`,
    type: 'reading',
    ja: r.title,
    reading: '',
    meanings: [`${r.titleEn} (reading)`],
    examples: [],
    passage: r.passage,
    difficulty: r.difficulty,
    jlpt: r.jlpt,
    skills: ['reading'],
    tags: ['reading'],
    order: idx,
    importance: 0.8,
    exercises: r.questions.map((q) => ({ ...q, difficulty: q.difficulty ?? r.difficulty })),
    source: CURATED_SOURCE,
  }));
}

function buildConjugations(): LearningItem[] {
  const forms: ConjugationForm[] = [...VERB_FORMS, ...ADJ_FORMS];
  return forms.map((form, idx) => ({
    id: `c:${form}`,
    type: 'conjugation',
    ja: FORM_INFO[form].label,
    reading: '',
    meanings: [FORM_INFO[form].en],
    examples: [],
    difficulty: FORM_INFO[form].difficulty,
    jlpt: FORM_INFO[form].difficulty >= 4 ? 'N4' : 'N5',
    skills: ['conjugation'],
    tags: ['conjugation', form],
    order: idx,
    importance: 0.9,
    notes: FORM_INFO[form].explain,
    source: CURATED_SOURCE,
  }));
}

export interface ContentLibrary {
  items: LearningItem[];
  byId: Map<string, LearningItem>;
  bySkill: Map<Skill, LearningItem[]>;
  version: string;
}

export function indexLibrary(items: LearningItem[], version = 'custom'): ContentLibrary {
  const byId = new Map<string, LearningItem>();
  const bySkill = new Map<Skill, LearningItem[]>();
  for (const item of items) {
    byId.set(item.id, item);
    for (const s of item.skills) {
      const list = bySkill.get(s) ?? [];
      list.push(item);
      bySkill.set(s, list);
    }
  }
  return { items, byId, bySkill, version };
}

export const CONTENT_VERSION = '2026.10.1';

let cached: ContentLibrary | null = null;

/** The bundled starter curriculum, built once and cached. */
export function getLibrary(): ContentLibrary {
  if (!cached) {
    const vocab = buildVocab();
    const items = [
      ...buildKana(),
      ...vocab,
      ...buildKanji(vocab),
      ...buildExpressions(),
      ...buildGrammar(),
      ...buildParticles(),
      ...buildConjugations(),
      ...buildReadings(),
    ];
    cached = indexLibrary(items, CONTENT_VERSION);
  }
  return cached;
}

/** Library with extra (imported) items merged in; bundled IDs win on conflict. */
export function extendLibrary(base: ContentLibrary, extra: LearningItem[]): ContentLibrary {
  const merged = [...base.items];
  for (const item of extra) if (!base.byId.has(item.id)) merged.push(item);
  return indexLibrary(merged, `${base.version}+${extra.length}`);
}
