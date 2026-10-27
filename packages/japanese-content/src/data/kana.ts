/**
 * Kana tables. Each row lists [kana, romaji]; difficulty rises through the
 * gojūon order, then voiced marks, then combination sounds. Katakana reuses
 * the same structure (generated from hiragana) at a slightly higher difficulty.
 */
export interface KanaRow {
  id: string;
  label: string;
  difficulty: number;
  chars: Array<[string, string]>;
}

export const HIRAGANA_ROWS: KanaRow[] = [
  { id: 'vowels', label: 'あ row', difficulty: 0.2, chars: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { id: 'k', label: 'か row', difficulty: 0.4, chars: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { id: 's', label: 'さ row', difficulty: 0.5, chars: [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { id: 't', label: 'た row', difficulty: 0.6, chars: [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']] },
  { id: 'n', label: 'な row', difficulty: 0.7, chars: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { id: 'h', label: 'は row', difficulty: 0.8, chars: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']] },
  { id: 'm', label: 'ま row', difficulty: 0.9, chars: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { id: 'y', label: 'や row', difficulty: 0.9, chars: [['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo']] },
  { id: 'r', label: 'ら row', difficulty: 1.0, chars: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { id: 'w', label: 'わ row', difficulty: 1.0, chars: [['わ', 'wa'], ['を', 'wo'], ['ん', 'n']] },
  { id: 'g', label: 'が row', difficulty: 1.2, chars: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { id: 'z', label: 'ざ row', difficulty: 1.3, chars: [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { id: 'd', label: 'だ row', difficulty: 1.4, chars: [['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'], ['ど', 'do']] },
  { id: 'b', label: 'ば row', difficulty: 1.3, chars: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
  { id: 'p', label: 'ぱ row', difficulty: 1.3, chars: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
  {
    id: 'combo',
    label: 'Combinations',
    difficulty: 1.7,
    chars: [
      ['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo'], ['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho'],
      ['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho'], ['にゃ', 'nya'], ['ひゃ', 'hya'], ['みゃ', 'mya'],
      ['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo'], ['ぎゃ', 'gya'], ['じゃ', 'ja'], ['じゅ', 'ju'],
      ['じょ', 'jo'], ['びょ', 'byo'], ['ぴょ', 'pyo'],
    ],
  },
];

/** Additional katakana-only combinations used for loanwords. */
export const KATAKANA_EXTRA: Array<[string, string]> = [
  ['ファ', 'fa'], ['フィ', 'fi'], ['フェ', 'fe'], ['フォ', 'fo'], ['ティ', 'ti'], ['ディ', 'di'],
  ['ウィ', 'wi'], ['ウェ', 'we'], ['ヴ', 'vu'], ['シェ', 'she'], ['チェ', 'che'], ['ジェ', 'je'],
];

/** Kana that learners commonly confuse — used as preferred distractors. */
export const CONFUSABLE_KANA: string[][] = [
  ['さ', 'ち', 'き'], ['ぬ', 'め'], ['ね', 'れ', 'わ'], ['る', 'ろ'], ['は', 'ほ', 'け'], ['い', 'り'],
  ['こ', 'に'], ['シ', 'ツ'], ['ソ', 'ン'], ['ク', 'ケ', 'タ'], ['ワ', 'ウ', 'フ'], ['ユ', 'コ'], ['ヌ', 'ス'],
  ['チ', 'テ'], ['マ', 'ム'], ['ア', 'マ'], ['セ', 'ヒ'],
];
