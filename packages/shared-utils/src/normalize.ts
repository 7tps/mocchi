/** Answer normalisation helpers shared by the validator and content checks. */

const SURROUNDING_PUNCT = /^[\s"'“”‘’.,!?;:()[\]「」『』。、！？・〜~]+|[\s"'“”‘’.,!?;:()[\]「」『』。、！？・〜~]+$/g;

export function normalizeEnglish(input: string): string {
  let s = input.normalize('NFKC').toLowerCase().trim();
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(SURROUNDING_PUNCT, '');
  s = s.replace(/[’']/g, "'");
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^(to|a|an|the)\s+/, '');
  s = s.replace(/[.!?]+$/, '');
  return s.trim();
}

/**
 * Japanese normalisation: NFKC folds half-width katakana and full-width
 * Latin, then all whitespace and terminal punctuation is removed. Kana and
 * kanji are left untouched so distinct words never collapse together.
 */
export function normalizeJapanese(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[。.!！?？、,]+$/u, '')
    .replace(/^[「『]|[」』]$/gu, '');
}

export function normalizeRomaji(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ū/g, 'uu')
    .replace(/ē/g, 'ee')
    .replace(/ō/g, 'ou')
    .replace(/[\s\-.]/g, '')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}
