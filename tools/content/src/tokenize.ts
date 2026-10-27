/** Sentence readings via kuromoji.js (IPADIC). Build time only. */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { isKanji, toHiragana } from '@jc/shared-utils';

interface KuromojiToken {
  surface_form: string;
  reading?: string;
  basic_form: string;
}
interface KuromojiTokenizer {
  tokenize(text: string): KuromojiToken[];
}

export interface Tokenizer {
  /**
   * Kana reading of a sentence, or null if some kanji has no known reading.
   * Tokens that spell the target word use its dictionary reading.
   */
  read(sentence: string, targetJa: string, targetReading: string): string | null;
}

export async function createTokenizer(): Promise<Tokenizer> {
  const require = createRequire(import.meta.url);
  const kuromoji = require('kuromoji') as {
    builder(opts: { dicPath: string }): { build(cb: (err: Error | null, t: KuromojiTokenizer) => void): void };
  };
  const dicPath = join(dirname(require.resolve('kuromoji/package.json')), 'dict');
  const tk = await new Promise<KuromojiTokenizer>((resolve, reject) =>
    kuromoji.builder({ dicPath }).build((err, t) => (err ? reject(err) : resolve(t))),
  );
  return {
    read(sentence, targetJa, targetReading) {
      let out = '';
      for (const t of tk.tokenize(sentence)) {
        const s = t.surface_form;
        if (![...s].some(isKanji)) out += s;
        else if (s === targetJa) out += targetReading;
        else if (t.reading && t.reading !== '*') out += toHiragana(t.reading);
        else return null;
      }
      return out;
    },
  };
}
