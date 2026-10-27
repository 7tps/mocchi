/**
 * Kana ⇄ romaji conversion. Used to accept romaji typed by learners without a
 * Japanese IME, and to show romaji hints. Conversion is strict: it never maps
 * one Japanese word onto a different one.
 */

// Hepburn romaji for each hiragana (digraphs listed separately).
const MONO: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'wi', ゑ: 'we', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゔ: 'vu',
};

const DIGRAPH: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', しぇ: 'she',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ちぇ: 'che',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', じぇ: 'je',
  ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
};

/** Alternate (Kunrei/Nihon-shiki and common learner) spellings accepted as input. */
export const ROMAJI_VARIANTS: Record<string, string[]> = {
  shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'],
  sha: ['sya'], shu: ['syu'], sho: ['syo'], cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'],
  ja: ['zya', 'jya'], ju: ['zyu', 'jyu'], jo: ['zyo', 'jyo'], wo: ['o'], n: ['nn', "n'"],
};

const ROMAJI_TO_KANA: Array<[string, string]> = (() => {
  const map = new Map<string, string>();
  const add = (r: string, k: string) => {
    if (!map.has(r)) map.set(r, k);
  };
  for (const [k, r] of Object.entries(DIGRAPH)) add(r, k);
  for (const [k, r] of Object.entries(MONO)) {
    if ('ぁぃぅぇぉゃゅょゐゑ'.includes(k)) continue;
    if (k === 'ぢ' || k === 'づ') continue;
    add(r, k);
  }
  for (const [canonical, variants] of Object.entries(ROMAJI_VARIANTS)) {
    const kana = map.get(canonical);
    if (!kana) continue;
    for (const v of variants) if (v !== 'o') add(v, kana);
  }
  add('di', 'ぢ');
  add('du', 'づ');
  add('xtsu', 'っ');
  add('ltsu', 'っ');
  add('xya', 'ゃ');
  add('xyu', 'ゅ');
  add('xyo', 'ょ');
  add('-', 'ー');
  // Longest keys first for greedy matching.
  return [...map.entries()].sort((a, b) => b[0].length - a[0].length);
})();

const HIRA_START = 0x3041;
const HIRA_END = 0x3096;
const KATA_OFFSET = 0x60;

export function isHiragana(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= HIRA_START && c <= HIRA_END) || ch === 'ー' || ch === 'ゝ' || ch === 'ゞ';
}

export function isKatakana(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x30a1 && c <= 0x30fa) || ch === 'ー';
}

export function isKanji(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || ch === '々';
}

export function isKanaString(s: string): boolean {
  return s.length > 0 && [...s].every((ch) => isHiragana(ch) || isKatakana(ch));
}

export function hasJapanese(s: string): boolean {
  return [...s].some((ch) => isHiragana(ch) || isKatakana(ch) || isKanji(ch));
}

export function toHiragana(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - KATA_OFFSET) : ch;
  }
  return out;
}

export function toKatakana(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    out += c >= HIRA_START && c <= HIRA_END ? String.fromCodePoint(c + KATA_OFFSET) : ch;
  }
  return out;
}

/** Hepburn romanisation of a kana string. Long vowels are written out (e.g. "ou"). */
export function kanaToRomaji(input: string): string {
  const s = toHiragana(input);
  let out = '';
  let geminate = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string;
    if (ch === 'っ') {
      geminate = true;
      continue;
    }
    let roma: string | undefined;
    const pair = s.slice(i, i + 2);
    if (DIGRAPH[pair]) {
      roma = DIGRAPH[pair];
      i++;
    } else if (ch === 'ー') {
      const last = out[out.length - 1];
      roma = last && 'aeiou'.includes(last) ? last : '-';
    } else {
      roma = MONO[ch] ?? ch;
    }
    if (geminate && roma && /^[a-z]/.test(roma)) {
      roma = (roma.startsWith('ch') ? 't' : roma[0]) + roma;
    }
    geminate = false;
    if (ch === 'ん' && /^[aeiouy]/.test(MONO[s[i + 1] ?? ''] ?? '')) roma = "n'";
    out += roma;
  }
  return out;
}

/**
 * Convert romaji to hiragana. Returns null if any part of the input cannot be
 * converted, so callers never compare a partially converted string.
 */
export function romajiToHiragana(input: string): string | null {
  const s = input.toLowerCase().replace(/\s/g, '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i] as string;
    const next = s[i + 1];
    if (ch === "'") {
      i++;
      continue;
    }
    // Double consonant → small tsu.
    if (next && ch === next && /[bcdfghjkmpqrstvwxyz]/.test(ch)) {
      out += 'っ';
      i++;
      continue;
    }
    if (ch === 't' && next === 'c') {
      out += 'っ';
      i++;
      continue;
    }
    // Syllabic n: "n" followed by a consonant (not y) or end, or "nn".
    if (ch === 'n') {
      if (next === 'n') {
        out += 'ん';
        i += 2;
        continue;
      }
      if (next === undefined || next === "'" || !/[aeiouy]/.test(next)) {
        out += 'ん';
        i++;
        continue;
      }
    }
    let matched = false;
    for (const [roma, kana] of ROMAJI_TO_KANA) {
      if (s.startsWith(roma, i)) {
        out += kana;
        i += roma.length;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return out;
}
