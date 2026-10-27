/**
 * Pinned third-party datasets used to build the JLPT content packs.
 * Bump a version/commit here, run `npm run content:fetch`, then `npm run content:build`.
 */
export interface DatasetSource {
  id: string;
  file: string;
  url: string;
  license: string;
  attribution: string;
}

const JMDICT_SIMPLIFIED = '3.6.2+20261026175559';
const JLPT_DECKS_COMMIT = '1ad66734417aca9dbcca6b2d5ee440cb13ab3ba0';
const KANJI_DATA_COMMIT = '00fd7079c3890f430759536f91aa5e854ec0ca4f';

const release = (name: string) =>
  `https://github.com/scriptin/jmdict-simplified/releases/download/${encodeURIComponent(JMDICT_SIMPLIFIED)}/${encodeURIComponent(`${name}-${JMDICT_SIMPLIFIED}.json.tgz`)}`;

export const DATASETS: DatasetSource[] = [
  {
    id: 'jmdict-examples',
    file: 'jmdict-examples-eng.json.tgz',
    url: release('jmdict-examples-eng'),
    license: 'CC BY-SA 4.0',
    attribution:
      'JMdict by the Electronic Dictionary Research and Development Group (EDRDG), used under the EDRDG licence (CC BY-SA 4.0); converted by jmdict-simplified. Example sentences from the Tatoeba project (CC BY 2.0 FR).',
  },
  {
    id: 'kanjidic2',
    file: 'kanjidic2-en.json.tgz',
    url: release('kanjidic2-en'),
    license: 'CC BY-SA 4.0',
    attribution: 'KANJIDIC2 by the EDRDG, used under the EDRDG licence (CC BY-SA 4.0); converted by jmdict-simplified.',
  },
  ...(['n5', 'n4', 'n3', 'n2', 'n1'] as const).map((level) => ({
    id: `jlpt-vocab-${level}`,
    file: `jlpt-vocab-${level}.csv`,
    url: `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/${JLPT_DECKS_COMMIT}/src/${level}.csv`,
    license: 'CC BY 4.0 (word lists) / MIT (repository)',
    attribution: "JLPT word lists by Jonathan Waller (tanos.co.uk), via open-anki-jlpt-decks. Levels are community estimates; the JLPT has not published official lists since 2010.",
  })),
  {
    id: 'kanji-levels',
    file: 'kanji-data.json',
    url: `https://raw.githubusercontent.com/davidluzgouveia/kanji-data/${KANJI_DATA_COMMIT}/kanji.json`,
    license: 'MIT (repository); levels from Jonathan Waller’s lists (CC BY 4.0)',
    attribution: 'Kanji JLPT levels from kanji-data by David Gouveia, based on Jonathan Waller’s lists. Only the level field is used.',
  },
];

export const CACHE_DIR = new URL('../../../.cache/datasets/', import.meta.url);
