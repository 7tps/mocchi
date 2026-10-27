/** Readers for the cached datasets (see sources.ts). */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { CACHE_DIR } from './sources';

const path = (file: string) => `${fileURLToPath(CACHE_DIR)}/${file}`;

/** First regular file inside a .tgz (the jmdict-simplified archives hold one JSON file). */
function readTgzJson(file: string): unknown {
  const tar = gunzipSync(readFileSync(path(file)));
  let off = 0;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const size = parseInt(header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim(), 8);
    const type = String.fromCharCode(header[156] ?? 0);
    off += 512;
    if (type === '0' || type === '\0') return JSON.parse(tar.subarray(off, off + size).toString('utf8'));
    off += Math.ceil(size / 512) * 512;
  }
  throw new Error(`${file}: no file in archive`);
}

// ---- JMdict (with Tatoeba examples) ----
export interface JmText {
  common: boolean;
  text: string;
  tags: string[];
  appliesToKanji?: string[];
}
export interface JmExample {
  source: { type: string; value: string };
  text: string;
  sentences: { lang: string; text: string }[];
}
export interface JmSense {
  partOfSpeech: string[];
  appliesToKanji: string[];
  appliesToKana: string[];
  misc: string[];
  field: string[];
  info: string[];
  gloss: { lang: string; text: string; type: string | null }[];
  examples?: JmExample[];
}
export interface JmWord {
  id: string;
  kanji: JmText[];
  kana: JmText[];
  sense: JmSense[];
}
export function readJmdict(): JmWord[] {
  return (readTgzJson('jmdict-examples-eng.json.tgz') as { words: JmWord[] }).words;
}

// ---- KANJIDIC2 ----
export interface KdCharacter {
  literal: string;
  misc: { grades: number | null; strokeCounts: number[]; frequency: number | null; jlptLevel: number | null };
  readingMeaning: {
    groups: { readings: { type: string; value: string }[]; meanings: { lang: string; value: string }[] }[];
    nanori: string[];
  } | null;
}
export function readKanjidic(): KdCharacter[] {
  return (readTgzJson('kanjidic2-en.json.tgz') as { characters: KdCharacter[] }).characters;
}

// ---- JLPT lists ----
export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export interface ListWord {
  expression: string;
  reading: string;
  meaning: string;
}

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.length)) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function readJlptWords(level: Level): ListWord[] {
  const rows = parseCsv(readFileSync(path(`jlpt-vocab-${level.toLowerCase()}.csv`), 'utf8'));
  return rows.slice(1).map(([expression = '', reading = '', meaning = '']) => ({ expression: expression.trim(), reading: reading.trim(), meaning }));
}

/** Kanji → JLPT level (new N1–N5 levels). */
export function readKanjiLevels(): Map<string, Level> {
  const data = JSON.parse(readFileSync(path('kanji-data.json'), 'utf8')) as Record<string, { jlpt_new: number | null }>;
  const out = new Map<string, Level>();
  for (const [ch, v] of Object.entries(data)) if (v.jlpt_new) out.set(ch, `N${v.jlpt_new}` as Level);
  return out;
}
