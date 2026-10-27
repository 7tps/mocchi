import type { ContentExercise, JlptBand, LearningItem, SourceInfo } from '@jc/shared-types';
import { isKanji } from '@jc/shared-utils';
import { CURATED_SOURCE, IMPORTANCE, extendLibrary, type ContentLibrary } from './library';
import { contentPackSchema, validateItems, type ValidationIssue } from './validate';

/**
 * JLPT level packs: N5–N1 content shipped outside the app bundle (built by
 * tools/content from open datasets plus the hand-written grammar in ./levels).
 * Bump when the pack contents change; download URLs include it.
 */
export const CONTENT_PACK_VERSION = '2026.10.1';

export const PACK_LEVELS: readonly JlptBand[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

/** Levels installed for a target: choosing N3 means N5, N4 and N3. */
export function levelsUpTo(target: JlptBand): JlptBand[] {
  return PACK_LEVELS.slice(0, PACK_LEVELS.indexOf(target) + 1);
}

export interface PackInfo {
  level: JlptBand;
  file: string;
  sha256: string;
  bytes: number;
  counts: { vocab: number; kanji: number; grammar: number; readings: number };
}

export interface ContentManifest {
  format: 'jc-content-manifest';
  contentVersion: string;
  /** Download base URL (ends with "/"); `file` is appended. */
  baseUrl: string;
  packs: PackInfo[];
}

export interface LevelPack {
  format: 'jc-content-pack';
  version: 1;
  name: string;
  level: JlptBand;
  contentVersion: string;
  source: SourceInfo;
  items: LearningItem[];
}

export type PackState = 'installed' | 'missing' | 'downloading' | 'failed';

/** What a device has installed, for settings screens. */
export interface ContentLevelStatus {
  level: JlptBand;
  state: PackState;
  /** Download size in bytes. */
  bytes: number;
  counts: PackInfo['counts'];
  /** Part of the chosen target level. */
  included: boolean;
  error?: string;
}

export interface ContentStatus {
  /** False when no manifest ships with this build (e.g. the browser preview). */
  available: boolean;
  targetLevel: JlptBand;
  contentVersion: string;
  levels: ContentLevelStatus[];
  busy: boolean;
}

const NATIVE_ID = /^(v|k|g|r|e):/;

/**
 * Parse a level pack. Packs whose checksum matched the manifest were validated
 * at build time, so `validate: false` skips the per-item schema pass.
 */
export function parseLevelPack(json: unknown, opts: { validate: boolean }): { pack: LevelPack | null; issues: ValidationIssue[] } {
  const head = json as Partial<LevelPack> | null;
  if (!head || head.format !== 'jc-content-pack' || !head.level || !PACK_LEVELS.includes(head.level) || !Array.isArray(head.items)) {
    return { pack: null, issues: [{ itemId: '(pack)', message: 'not a level pack' }] };
  }
  if (!opts.validate) return { pack: head as LevelPack, issues: [] };
  const parsed = contentPackSchema.safeParse(json);
  if (!parsed.success) return { pack: null, issues: [{ itemId: '(pack)', message: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }] };
  const items = head.items.filter((i) => NATIVE_ID.test(i.id));
  const issues = validateItems(items);
  const bad = new Set(issues.map((i) => i.itemId));
  return { pack: { ...(head as LevelPack), items: items.filter((i) => !bad.has(i.id)) }, issues };
}

/** Vocabulary/kanji/grammar/reading counts per JLPT level in a library. */
export function countsByLevel(lib: ContentLibrary): Partial<Record<JlptBand, PackInfo['counts']>> {
  const out: Partial<Record<JlptBand, PackInfo['counts']>> = {};
  for (const item of lib.items) {
    if (!item.jlpt) continue;
    const c = (out[item.jlpt] ??= { vocab: 0, kanji: 0, grammar: 0, readings: 0 });
    if (item.type === 'vocab' || item.type === 'expression') c.vocab++;
    else if (item.type === 'kanji') c.kanji++;
    else if (item.type === 'grammar' || item.type === 'particle') c.grammar++;
    else if (item.type === 'reading') c.readings++;
  }
  return out;
}

/** Bundled library plus packs, merged in level order (bundled items win on id conflicts). */
export function libraryWithPacks(base: ContentLibrary, packs: readonly LevelPack[]): ContentLibrary {
  if (!packs.length) return base;
  const sorted = packs.slice().sort((a, b) => PACK_LEVELS.indexOf(a.level) - PACK_LEVELS.indexOf(b.level));
  const lib = extendLibrary(base, sorted.flatMap((p) => p.items));
  return { ...lib, version: `${base.version}+${sorted.map((p) => p.level).join('')}@${CONTENT_PACK_VERSION}` };
}

// ---- hand-written level content (grammar, reading passages) ----

export interface LevelExample {
  ja: string;
  en: string;
  /** Kana reading; generated at pack build time when omitted. */
  reading?: string;
}

export interface LevelGrammar {
  id: string;
  pattern: string;
  meaning: string;
  formation: string;
  jlpt: JlptBand;
  difficulty: number;
  examples: LevelExample[];
  mistakes?: string[];
  notes?: string;
  confusedWith?: string[];
  exercises: ContentExercise[];
}

export interface LevelReading {
  id: string;
  title: string;
  titleEn: string;
  jlpt: JlptBand;
  difficulty: number;
  passage: LevelExample;
  questions: ContentExercise[];
}

export type ReadingOf = (japanese: string) => string;

function hasKanji(s: string): boolean {
  return [...s].some(isKanji);
}

export function grammarEntryToItem(g: LevelGrammar, order: number, readingOf: ReadingOf): LearningItem {
  return {
    id: `g:${g.id}`,
    type: 'grammar',
    ja: g.pattern,
    reading: '',
    meanings: [g.meaning],
    examples: g.examples.map((e) => ({ ja: e.ja, en: e.en, reading: e.reading ?? readingOf(e.ja) })),
    difficulty: g.difficulty,
    jlpt: g.jlpt,
    skills: ['grammar'],
    tags: ['grammar', g.jlpt.toLowerCase()],
    order,
    importance: IMPORTANCE[g.jlpt],
    notes: g.notes,
    formation: g.formation,
    commonMistakes: g.mistakes ?? [],
    confusedWith: g.confusedWith?.map((c) => `g:${c}`),
    exercises: g.exercises.map((e) => ({
      ...e,
      difficulty: e.difficulty ?? g.difficulty,
      promptReading: e.promptReading ?? (e.kind === 'fill-blank' && hasKanji(e.prompt) ? e.prompt.split('＿＿').map(readingOf).join('＿＿') : undefined),
    })),
    source: CURATED_SOURCE,
  };
}

export function readingEntryToItem(r: LevelReading, order: number, readingOf: ReadingOf): LearningItem {
  return {
    id: `r:${r.id}`,
    type: 'reading',
    ja: r.title,
    reading: '',
    meanings: [`${r.titleEn} (reading)`],
    examples: [],
    passage: { ja: r.passage.ja, en: r.passage.en, reading: r.passage.reading ?? readingOf(r.passage.ja) },
    difficulty: r.difficulty,
    jlpt: r.jlpt,
    skills: ['reading'],
    tags: ['reading', r.jlpt.toLowerCase()],
    order,
    importance: 0.8,
    exercises: r.questions.map((q) => ({ ...q, difficulty: q.difficulty ?? r.difficulty })),
    source: CURATED_SOURCE,
  };
}
