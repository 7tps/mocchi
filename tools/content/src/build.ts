/**
 * Build the JLPT level packs (dist/content/jlpt-n5.json.gz … jlpt-n1.json.gz)
 * plus manifest.json from the pinned datasets and the hand-written level
 * grammar in @jc/japanese-content. Every item is validated; the build fails
 * on any issue. Items already in the bundled curriculum are skipped.
 *
 *   npm run content:fetch && npm run content:build
 *
 * Env: MOCCHI_CONTENT_URL overrides the download base URL written to the manifest.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import type { ExampleSentence, LearningItem, PartOfSpeech, SourceInfo } from '@jc/shared-types';
import {
  BAND_RANGES,
  CONTENT_PACK_VERSION,
  IMPORTANCE,
  KANJI_RANGES,
  LEVEL_GRAMMAR,
  LEVEL_READINGS,
  getLibrary,
  grammarEntryToItem,
  readingEntryToItem,
  validateItems,
  type ContentManifest,
  type LevelPack,
} from '@jc/japanese-content';
import { hasJapanese, isKanaString, isKanji, isKatakana, kanaToRomaji, toHiragana } from '@jc/shared-utils';
import { LEVELS, readJlptWords, readJmdict, readKanjidic, readKanjiLevels, type JmSense, type JmWord, type Level } from './datasets';
import { DATASETS } from './sources';
import { createTokenizer, type Tokenizer } from './tokenize';

const OUT = fileURLToPath(new URL('../../../dist/content/', import.meta.url));
const BASE_URL = process.env.MOCCHI_CONTENT_URL ?? `https://github.com/7tps/mocchi/releases/download/content-${CONTENT_PACK_VERSION}/`;

const src = (id: string) => DATASETS.find((d) => d.id === id) as (typeof DATASETS)[number];
const VOCAB_SOURCE: SourceInfo = {
  id: 'jlpt-open-data',
  license: 'CC BY-SA 4.0',
  attribution: `${src('jmdict-examples').attribution} ${src('jlpt-vocab-n5').attribution}`,
};
const KANJI_SOURCE: SourceInfo = {
  id: 'jlpt-open-data-kanji',
  license: 'CC BY-SA 4.0',
  attribution: `${src('kanjidic2').attribution} ${src('kanji-levels').attribution}`,
};

// ---------- part of speech ----------

/** JMdict POS codes whose conjugation the engine's regular rules would get wrong. */
const IRREGULAR = /^(v5aru|v5u-s|v5r-i|vs-s|vs-c|vz|v2|v4|vn|vr|adj-ix|adj-kari|adj-ku|adj-shiku|adj-nari)/;

function mapPos(tags: string[], ja: string, reading: string): { pos: PartOfSpeech; irregular: boolean } {
  const has = (re: RegExp) => tags.some((t) => re.test(t));
  const irregular = has(IRREGULAR) && reading !== 'いい' && reading !== 'ある';
  if (has(/^v5k-s/)) return { pos: 'verb-godan', irregular: !reading.endsWith('いく') };
  if (has(/^v5/)) return { pos: 'verb-godan', irregular };
  if (has(/^v1/)) return { pos: 'verb-ichidan', irregular: irregular || tags.includes('v1-s') };
  if (has(/^vk$/)) return { pos: 'verb-kuru', irregular: ja !== '来る' && reading !== 'くる' };
  if (has(/^vs-i$/) && reading.endsWith('する')) return { pos: 'verb-suru', irregular: reading !== 'する' };
  if (has(/^vs-s$|^vz$/)) return { pos: 'verb-suru', irregular: true };
  if (has(/^adj-i$/)) return { pos: 'adj-i', irregular: false };
  if (has(/^adj-ix$/)) return { pos: 'adj-i', irregular: reading !== 'いい' };
  if (has(/^adj-na$/)) return { pos: 'adj-na', irregular: false };
  if (has(/^vs$/) && has(/^n$/)) return { pos: 'verb-suru', irregular: false };
  if (has(/^n$|^n-adv$|^n-t$|^adj-no$/)) return { pos: 'noun', irregular: false };
  if (has(/^pn$/)) return { pos: 'pronoun', irregular: false };
  if (has(/^adv/)) return { pos: 'adverb', irregular: false };
  if (has(/^conj$/)) return { pos: 'conjunction', irregular: false };
  if (has(/^int$/)) return { pos: 'interjection', irregular: false };
  if (has(/^ctr$/)) return { pos: 'counter', irregular: false };
  if (has(/^num$/)) return { pos: 'number', irregular: false };
  if (has(/^pref$/)) return { pos: 'prefix', irregular: false };
  if (has(/^suf$|^n-suf$/)) return { pos: 'suffix', irregular: false };
  if (has(/^prt$/)) return { pos: 'particle', irregular: false };
  return { pos: 'expression', irregular: true };
}

// ---------- JMdict lookup ----------

const SKIP_MISC = new Set(['arch', 'obs', 'rare', 'obsc', 'dated', 'vulg', 'X', 'derog']);

interface Index {
  byKanji: Map<string, JmWord[]>;
  byKana: Map<string, JmWord[]>;
}

function indexJmdict(words: JmWord[]): Index {
  const byKanji = new Map<string, JmWord[]>();
  const byKana = new Map<string, JmWord[]>();
  const add = (m: Map<string, JmWord[]>, k: string, w: JmWord) => m.set(k, [...(m.get(k) ?? []), w]);
  for (const w of words) {
    for (const k of w.kanji) add(byKanji, k.text, w);
    for (const k of w.kana) add(byKana, k.text, w);
  }
  return { byKanji, byKana };
}

function applies(sense: JmSense, ja: string, reading: string, kanaOnly: boolean): boolean {
  const k = sense.appliesToKanji.includes('*') || sense.appliesToKanji.includes(ja) || kanaOnly;
  const r = sense.appliesToKana.includes('*') || sense.appliesToKana.includes(reading);
  return k && r;
}

function findEntry(idx: Index, ja: string, reading: string): JmWord | undefined {
  const kanaOnly = !hasKanjiChar(ja);
  const candidates = kanaOnly
    ? (idx.byKana.get(ja) ?? [])
    : (idx.byKanji.get(ja) ?? []).filter((w) => w.kana.some((k) => k.text === reading || toHiragana(k.text) === toHiragana(reading)));
  const score = (w: JmWord) =>
    (w.kanji.some((k) => k.text === ja && k.common) || w.kana.some((k) => k.text === (kanaOnly ? ja : reading) && k.common) ? 0 : 10) +
    (w.sense.some((s) => s.examples?.length) ? 0 : 2) +
    (kanaOnly && w.kanji.length && !w.sense.some((s) => s.misc.includes('uk')) ? 3 : 0);
  return candidates.slice().sort((a, b) => score(a) - score(b) || Number(a.id) - Number(b.id))[0];
}

function hasKanjiChar(s: string): boolean {
  return [...s].some(isKanji);
}

function cleanGloss(g: string): string {
  return g.replace(/\s+/g, ' ').trim();
}

function meaningsFor(senses: JmSense[]): string[] {
  const out: string[] = [];
  const push = (g: string) => {
    const c = cleanGloss(g);
    if (c && c.length <= 48 && !out.some((o) => o.toLowerCase() === c.toLowerCase())) out.push(c);
  };
  // First sense (up to three glosses) plus the first gloss of the second sense.
  senses.slice(0, 2).forEach((s, i) => {
    const glosses = s.gloss.filter((g) => g.lang === 'eng' && g.type !== 'explanation').map((g) => g.text);
    for (const g of i === 0 ? glosses.slice(0, 3) : glosses.slice(0, 1)) push(g);
  });
  if (!out.length) {
    const first = senses[0]?.gloss[0]?.text;
    if (first) out.push(cleanGloss(first).slice(0, 60));
  }
  return out.slice(0, 4);
}

// ---------- examples ----------

/** Allowed in example readings (mirrors validate.ts READING_CHARS). */
const READING_OK = /^[぀-ヿー・、。！？「」『』\s0-9０-９A-Za-z]*$/u;

function exampleFor(senses: JmSense[], ja: string, reading: string, tok: Tokenizer): ExampleSentence | undefined {
  const all = senses.flatMap((s, i) => (s.examples ?? []).map((e) => ({ e, i })));
  const scored = all
    .map(({ e, i }) => {
      const jpn = e.sentences.find((s) => s.lang === 'jpn')?.text.trim() ?? '';
      const eng = e.sentences.find((s) => s.lang === 'eng')?.text.trim() ?? '';
      return { jpn, eng, score: i * 3 + (e.text === ja ? 0 : 1) + Math.max(0, jpn.length - 18) / 6 };
    })
    .filter((x) => x.jpn && x.eng && x.jpn.length <= 34 && x.eng.length <= 100)
    .sort((a, b) => a.score - b.score);
  for (const x of scored) {
    const r = tok.read(x.jpn, ja, reading);
    if (r && READING_OK.test(r)) return { ja: x.jpn, reading: r, en: x.eng };
  }
  return undefined;
}

// ---------- build ----------

interface BuiltWord {
  item: LearningItem;
  level: Level;
  common: boolean;
}

function spread(range: [number, number], i: number, count: number): number {
  const t = count <= 1 ? 0 : i / (count - 1);
  return Math.round((range[0] + (range[1] - range[0]) * t) * 100) / 100;
}

async function main() {
  const t0 = Date.now();
  const curated = getLibrary();
  const curatedVocab = curated.items.filter((i) => i.type === 'vocab' || i.type === 'expression');
  const curatedKeys = new Set(curatedVocab.map((i) => `${i.ja}|${i.reading}`));
  const curatedJa = new Set(curatedVocab.map((i) => i.ja));
  const usedIds = new Set(curated.items.map((i) => i.id));

  console.log('reading datasets…');
  const jm = indexJmdict(readJmdict());
  const kanjidic = new Map(readKanjidic().map((c) => [c.literal, c]));
  const kanjiLevels = readKanjiLevels();
  const tok = await createTokenizer();

  const words: BuiltWord[] = [];
  const seenKeys = new Set<string>();
  const unmatched: Record<Level, string[]> = { N5: [], N4: [], N3: [], N2: [], N1: [] };
  const stats: Record<string, Record<string, number>> = {};

  for (const level of LEVELS) {
    const levelWords: BuiltWord[] = [];
    for (const raw of readJlptWords(level)) {
      let rawJa = cleanForm(raw.expression);
      let rawReading = cleanForm(raw.reading);
      // A few rows have expression and reading swapped.
      if (hasKanjiChar(rawReading) && !hasKanjiChar(rawJa)) [rawJa, rawReading] = [rawReading, rawJa];
      const listedSuru = /する\)?\s*$/.test(raw.reading) || rawJa.endsWith('する');
      let match: { ja: string; reading: string; entry: JmWord } | undefined;
      for (const [j, r] of formVariants(rawJa, isKatakanaWord(rawJa) ? rawReading : toHiragana(rawReading))) {
        const entry = j && r && isKanaString(r) ? findEntry(jm, j, r) : undefined;
        if (entry) {
          match = { ja: j, reading: r, entry };
          break;
        }
      }
      const key = match ? `${match.ja}|${match.reading}` : `${rawJa}|${rawReading}`;
      if (!rawJa || seenKeys.has(key) || curatedKeys.has(key)) continue;
      seenKeys.add(key);
      if (!match) {
        unmatched[level].push(`${raw.expression} (${raw.reading})`);
        continue;
      }
      const { ja, reading, entry } = match;
      const kanaOnly = !hasKanjiChar(ja);
      const senses = entry.sense.filter((s) => applies(s, ja, reading, kanaOnly) && !s.misc.some((m) => SKIP_MISC.has(m)));
      const useSenses = senses.length ? senses : entry.sense;
      const meanings = meaningsFor(useSenses);
      if (!meanings.length) {
        unmatched[level].push(`${ja} (${reading}): no English gloss`);
        continue;
      }
      const posTags = useSenses[0]?.partOfSpeech ?? [];
      const { pos, irregular } = listedSuru && !ja.endsWith('する') && posTags.includes('vs') ? { pos: 'verb-suru' as const, irregular: false } : mapPos(posTags, ja, reading);
      const example = exampleFor(useSenses, ja, reading, tok);
      const loan = isKatakanaWord(ja);
      const id = !usedIds.has(`v:${ja}`) && !curatedJa.has(ja) ? `v:${ja}` : `v:${ja}:${reading}`;
      if (usedIds.has(id)) continue;
      usedIds.add(id);
      const common = entry.kanji.some((k) => k.text === ja && k.common) || entry.kana.some((k) => k.text === reading && k.common);
      const tags = ['jlpt-list', level.toLowerCase()];
      if (loan) tags.push('loanword');
      if (irregular) tags.push('irregular-conjugation');
      levelWords.push({
        level,
        common,
        item: {
          id,
          type: 'vocab',
          ja,
          reading,
          romaji: kanaToRomaji(reading),
          meanings,
          partOfSpeech: pos,
          examples: example ? [example] : [],
          difficulty: 0,
          jlpt: level,
          skills: loan ? ['vocabulary', 'katakana'] : ['vocabulary'],
          tags,
          order: 0,
          importance: Math.round(IMPORTANCE[level] * 0.9 * 100) / 100,
          notes: useSenses[0]?.info.length ? useSenses[0].info.join('; ') : undefined,
          source: VOCAB_SOURCE,
        },
      });
    }
    // Common words first, then by how familiar their kanji are.
    const kanjiRank = (s: string) => (hasKanjiChar(s) ? Math.max(0, ...[...s].filter(isKanji).map((c) => kanjidic.get(c)?.misc.frequency ?? 2500)) : 800);
    levelWords.sort((a, b) => Number(b.common) - Number(a.common) || kanjiRank(a.item.ja) - kanjiRank(b.item.ja));
    levelWords.forEach((w, i) => {
      w.item.difficulty = spread(BAND_RANGES[level], i, levelWords.length);
      w.item.order = 10_000 * (LEVELS.indexOf(level) + 1) + i;
    });
    words.push(...levelWords);
    stats[level] = { vocab: levelWords.length, withExample: levelWords.filter((w) => w.item.examples.length).length, unmatched: unmatched[level].length };
  }

  // ---- kanji ----
  const allVocab = [...curatedVocab.map((i) => ({ item: i, level: (i.jlpt ?? 'N3') as Level, common: true })), ...words];
  const curatedKanji = new Set(curated.items.filter((i) => i.type === 'kanji').map((i) => i.ja));
  const kanjiByLevel = new Map<Level, LearningItem[]>(LEVELS.map((l) => [l, []]));
  for (const level of LEVELS) {
    const chars = [...kanjiLevels.entries()].filter(([c, l]) => l === level && !curatedKanji.has(c)).map(([c]) => c);
    chars.sort((a, b) => (kanjidic.get(a)?.misc.frequency ?? 9999) - (kanjidic.get(b)?.misc.frequency ?? 9999));
    const out: LearningItem[] = [];
    chars.forEach((ch, i) => {
      const kd = kanjidic.get(ch);
      const group = kd?.readingMeaning?.groups[0];
      if (!group) return;
      const on = group.readings.filter((r) => r.type === 'ja_on').map((r) => r.value).slice(0, 3);
      const kun = group.readings.filter((r) => r.type === 'ja_kun' && !r.value.includes('-')).map((r) => r.value).slice(0, 4);
      const meanings = group.meanings.filter((m) => m.lang === 'en').map((m) => m.value).slice(0, 4);
      if (!meanings.length || (!on.length && !kun.length)) return;
      const li = LEVELS.indexOf(level);
      const compounds = allVocab
        .filter((w) => w.item.ja.includes(ch) && w.item.ja.length <= 4 && [...w.item.ja].every((c) => !isKanji(c) || c === ch || (kanjiLevels.has(c) && LEVELS.indexOf(kanjiLevels.get(c)!) <= li) || curatedKanji.has(c)))
        .sort((a, b) => Math.abs(LEVELS.indexOf(a.level) - li) - Math.abs(LEVELS.indexOf(b.level) - li) || Number(b.common) - Number(a.common) || a.item.ja.length - b.item.ja.length)
        .slice(0, 3);
      const single = allVocab.find((w) => w.item.ja === ch);
      const primary = single?.item.reading ?? (on[0] ? toHiragana(on[0]) : (kun[0] ?? '').split('.')[0] ?? '');
      const examples: ExampleSentence[] = [];
      for (const c of compounds) if (examples.length < 2 && c.item.examples[0]) examples.push(c.item.examples[0]);
      out.push({
        id: `k:${ch}`,
        type: 'kanji',
        ja: ch,
        reading: primary,
        meanings,
        onyomi: on,
        kunyomi: kun,
        examples,
        relatedVocab: compounds.map((c) => c.item.id),
        exercises: compounds.map((c, n) => ({
          id: `k:${ch}:${n}`,
          kind: 'fill-blank' as const,
          prompt: c.item.ja,
          promptReading: c.item.reading,
          promptEn: c.item.meanings[0],
          answer: c.item.reading,
          explanation: `${c.item.ja} (${c.item.reading}) — ${c.item.meanings[0]}`,
        })),
        difficulty: spread(KANJI_RANGES[level], i, chars.length),
        jlpt: level,
        skills: ['kanji'],
        tags: ['kanji', 'jlpt-list', level.toLowerCase()],
        order: 10_000 * (li + 1) + i,
        importance: Math.round(IMPORTANCE[level] * 0.9 * 100) / 100,
        source: KANJI_SOURCE,
      });
    });
    kanjiByLevel.set(level, out);
    stats[level]!.kanji = out.length;
  }

  // ---- grammar + readings (hand-written, this project) ----
  const unread: string[] = [];
  const readingOf = (s: string) => {
    const r = tok.read(s, '', '');
    if (r === null || !READING_OK.test(r)) unread.push(s);
    return r ?? '';
  };
  mkdirSync(OUT, { recursive: true });
  const manifest: ContentManifest = { format: 'jc-content-manifest', contentVersion: CONTENT_PACK_VERSION, baseUrl: BASE_URL, packs: [] };
  let failed = false;
  for (const level of LEVELS) {
    const grammar = (LEVEL_GRAMMAR[level] ?? []).map((g, i) => grammarEntryToItem(g, 10_000 * (LEVELS.indexOf(level) + 1) + i, readingOf));
    const readings = (LEVEL_READINGS[level] ?? []).map((r, i) => readingEntryToItem(r, 10_000 * (LEVELS.indexOf(level) + 1) + i, readingOf));
    const items = [...words.filter((w) => w.level === level).map((w) => w.item), ...(kanjiByLevel.get(level) ?? []), ...grammar, ...readings];
    for (const i of items) if (curated.byId.has(i.id)) throw new Error(`${level}: ${i.id} duplicates a bundled item`);
    const issues = validateItems(items);
    if (issues.length) {
      failed = true;
      console.error(`${level}: ${issues.length} validation issues`, issues.slice(0, 20));
    }
    stats[level]!.grammar = grammar.length;
    stats[level]!.readings = readings.length;
    const pack: LevelPack = {
      format: 'jc-content-pack',
      version: 1,
      name: `JLPT ${level} level pack`,
      level,
      contentVersion: CONTENT_PACK_VERSION,
      source: { id: 'jlpt-level-pack', license: 'CC BY-SA 4.0 (dictionary data); MIT (grammar and readings)', attribution: `${VOCAB_SOURCE.attribution} ${KANJI_SOURCE.attribution}` },
      items,
    };
    const file = `jlpt-${level.toLowerCase()}.json.gz`;
    const gz = gzipSync(Buffer.from(JSON.stringify(pack)), { level: 9 });
    writeFileSync(`${OUT}/${file}`, gz);
    manifest.packs.push({
      level,
      file,
      sha256: createHash('sha256').update(gz).digest('hex'),
      bytes: gz.length,
      counts: { vocab: stats[level]!.vocab ?? 0, kanji: stats[level]!.kanji ?? 0, grammar: grammar.length, readings: readings.length },
    });
  }
  writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
  writeFileSync(`${OUT}/unmatched.txt`, LEVELS.map((l) => `## ${l}\n${unmatched[l].join('\n')}`).join('\n\n'));
  writeFileSync(`${OUT}/ATTRIBUTION.txt`, attributionText());
  if (unread.length) {
    failed = true;
    console.error('No automatic reading (add reading: explicitly):', unread);
  }
  console.table(stats);
  for (const p of manifest.packs) console.log(`${p.file}  ${(p.bytes / 1024).toFixed(0)} KB`);
  console.log(`built in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${OUT}`);
  if (failed) process.exit(1);
}

/** Strip list annotations: "(する)", "(かん)", "(〜を)", "〜", alternatives after "、" or "/". */
function cleanForm(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\([^)]*\)/g, '')
    .split(/[/;、,。]/)[0]!
    .replace(/[~〜～]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** Lookup variants for a list entry: as listed, then without a trailing する / な / と. */
function formVariants(ja: string, reading: string): [string, string][] {
  const out: [string, string][] = [[ja, reading]];
  for (const suffix of ['する', 'な', 'と', 'に']) {
    if (ja.endsWith(suffix) && reading.endsWith(suffix) && ja.length > suffix.length) out.push([ja.slice(0, -suffix.length), reading.slice(0, -suffix.length)]);
    else if (reading.endsWith(suffix) && !ja.endsWith(suffix) && suffix === 'する') out.push([ja, reading.slice(0, -2)]);
  }
  return out;
}

function isKatakanaWord(s: string): boolean {
  return [...s].every((c) => isKatakana(c) || c === 'ー' || c === '・') && hasJapanese(s);
}

function attributionText(): string {
  return [
    'Mocchi JLPT level packs — data sources',
    '',
    ...DATASETS.filter((d, i, all) => all.findIndex((x) => x.attribution === d.attribution) === i).map((d) => `- ${d.attribution} Licence: ${d.license}. ${d.url}`),
    '- Example-sentence readings generated with kuromoji.js (Apache-2.0) and the IPADIC dictionary; occasional misreadings are possible.',
    '- Grammar explanations, drills and reading passages: original content of this project (MIT).',
    '',
    'The dictionary-derived data in these packs is distributed under CC BY-SA 4.0 (share-alike).',
    'JLPT levels are community estimates. The JLPT has not published official word or kanji lists since 2010.',
  ].join('\n');
}

await main();
