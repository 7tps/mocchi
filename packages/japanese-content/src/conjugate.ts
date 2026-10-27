import type { PartOfSpeech } from '@jc/shared-types';

export type ConjugationForm =
  | 'masu'
  | 'masen'
  | 'mashita'
  | 'te'
  | 'ta'
  | 'nai'
  | 'potential'
  | 'volitional'
  | 'adj-negative'
  | 'adj-past';

export interface Conjugated {
  ja: string;
  reading: string;
}

export const VERB_FORMS: ConjugationForm[] = ['masu', 'masen', 'mashita', 'te', 'ta', 'nai', 'potential', 'volitional'];
export const ADJ_FORMS: ConjugationForm[] = ['adj-negative', 'adj-past'];

export const FORM_INFO: Record<ConjugationForm, { label: string; en: string; difficulty: number; explain: string }> = {
  masu: { label: 'ます-form', en: 'polite present', difficulty: 1.8, explain: 'Polite present: verb stem + ます.' },
  masen: { label: 'ません-form', en: 'polite negative', difficulty: 2.0, explain: 'Polite negative: verb stem + ません.' },
  mashita: { label: 'ました-form', en: 'polite past', difficulty: 2.1, explain: 'Polite past: verb stem + ました.' },
  te: { label: 'て-form', en: 'connective / request', difficulty: 2.9, explain: 'Godan: う・つ・る→って, む・ぶ・ぬ→んで, く→いて, ぐ→いで, す→して (行く→行って). Ichidan: drop る + て.' },
  ta: { label: 'た-form', en: 'plain past', difficulty: 3.1, explain: 'Same sound changes as the て-form, ending in た/だ.' },
  nai: { label: 'ない-form', en: 'plain negative', difficulty: 3.0, explain: 'Godan: change the final u-sound to a-sound + ない (う→わ). Ichidan: drop る + ない. ある→ない.' },
  potential: { label: 'potential form', en: 'can do', difficulty: 4.2, explain: 'Godan: final u-sound → e-sound + る. Ichidan: drop る + られる. する→できる, 来る→来られる.' },
  volitional: { label: 'volitional form', en: "let's / will (plain)", difficulty: 4.4, explain: 'Godan: final u-sound → o-sound + う. Ichidan: drop る + よう.' },
  'adj-negative': { label: 'negative', en: 'is not', difficulty: 2.2, explain: 'い-adjectives: drop い + くない (いい→よくない). な-adjectives: + じゃない.' },
  'adj-past': { label: 'past', en: 'was', difficulty: 2.5, explain: 'い-adjectives: drop い + かった (いい→よかった). な-adjectives: + だった.' },
};

const GODAN_ROWS: Record<string, { a: string; i: string; e: string; o: string; te: string; ta: string }> = {
  う: { a: 'わ', i: 'い', e: 'え', o: 'お', te: 'って', ta: 'った' },
  く: { a: 'か', i: 'き', e: 'け', o: 'こ', te: 'いて', ta: 'いた' },
  ぐ: { a: 'が', i: 'ぎ', e: 'げ', o: 'ご', te: 'いで', ta: 'いだ' },
  す: { a: 'さ', i: 'し', e: 'せ', o: 'そ', te: 'して', ta: 'した' },
  つ: { a: 'た', i: 'ち', e: 'て', o: 'と', te: 'って', ta: 'った' },
  ぬ: { a: 'な', i: 'に', e: 'ね', o: 'の', te: 'んで', ta: 'んだ' },
  ぶ: { a: 'ば', i: 'び', e: 'べ', o: 'ぼ', te: 'んで', ta: 'んだ' },
  む: { a: 'ま', i: 'み', e: 'め', o: 'も', te: 'んで', ta: 'んだ' },
  る: { a: 'ら', i: 'り', e: 'れ', o: 'ろ', te: 'って', ta: 'った' },
};

function both(ja: string, reading: string, dropJa: number, dropReading: number, suffix: string): Conjugated {
  return { ja: ja.slice(0, ja.length - dropJa) + suffix, reading: reading.slice(0, reading.length - dropReading) + suffix };
}

function godan(ja: string, reading: string, form: ConjugationForm): Conjugated {
  const last = reading.slice(-1);
  const row = GODAN_ROWS[last];
  if (!row) throw new Error(`Not a godan verb ending: ${ja}`);
  const isIku = reading === 'いく' || reading.endsWith('いく') && ja.endsWith('行く');
  switch (form) {
    case 'masu': return both(ja, reading, 1, 1, `${row.i}ます`);
    case 'masen': return both(ja, reading, 1, 1, `${row.i}ません`);
    case 'mashita': return both(ja, reading, 1, 1, `${row.i}ました`);
    case 'te': return both(ja, reading, 1, 1, isIku ? 'って' : row.te);
    case 'ta': return both(ja, reading, 1, 1, isIku ? 'った' : row.ta);
    case 'nai': return reading === 'ある' ? { ja: 'ない', reading: 'ない' } : both(ja, reading, 1, 1, `${row.a}ない`);
    case 'potential': return both(ja, reading, 1, 1, `${row.e}る`);
    case 'volitional': return both(ja, reading, 1, 1, `${row.o}う`);
    default: throw new Error(`Form ${form} does not apply to verbs`);
  }
}

function ichidan(ja: string, reading: string, form: ConjugationForm): Conjugated {
  const suffix: Partial<Record<ConjugationForm, string>> = {
    masu: 'ます', masen: 'ません', mashita: 'ました', te: 'て', ta: 'た', nai: 'ない', potential: 'られる', volitional: 'よう',
  };
  const s = suffix[form];
  if (!s) throw new Error(`Form ${form} does not apply to verbs`);
  return both(ja, reading, 1, 1, s);
}

function suru(ja: string, reading: string, form: ConjugationForm): Conjugated {
  const stemJa = ja.endsWith('する') ? ja.slice(0, -2) : ja;
  const stemReading = reading.endsWith('する') ? reading.slice(0, -2) : reading;
  const suffix: Partial<Record<ConjugationForm, string>> = {
    masu: 'します', masen: 'しません', mashita: 'しました', te: 'して', ta: 'した', nai: 'しない', potential: 'できる', volitional: 'しよう',
  };
  const s = suffix[form];
  if (!s) throw new Error(`Form ${form} does not apply to verbs`);
  return { ja: stemJa + s, reading: stemReading + s };
}

function kuru(form: ConjugationForm): Conjugated {
  const table: Partial<Record<ConjugationForm, Conjugated>> = {
    masu: { ja: '来ます', reading: 'きます' },
    masen: { ja: '来ません', reading: 'きません' },
    mashita: { ja: '来ました', reading: 'きました' },
    te: { ja: '来て', reading: 'きて' },
    ta: { ja: '来た', reading: 'きた' },
    nai: { ja: '来ない', reading: 'こない' },
    potential: { ja: '来られる', reading: 'こられる' },
    volitional: { ja: '来よう', reading: 'こよう' },
  };
  const c = table[form];
  if (!c) throw new Error(`Form ${form} does not apply to verbs`);
  return c;
}

function adjective(ja: string, reading: string, pos: PartOfSpeech, form: ConjugationForm): Conjugated {
  if (pos === 'adj-na') {
    if (form === 'adj-negative') return { ja: `${ja}じゃない`, reading: `${reading}じゃない` };
    if (form === 'adj-past') return { ja: `${ja}だった`, reading: `${reading}だった` };
  } else {
    const isIi = reading === 'いい';
    const baseJa = isIi ? 'よい' : ja;
    const baseReading = isIi ? 'よい' : reading;
    if (form === 'adj-negative') return both(baseJa, baseReading, 1, 1, 'くない');
    if (form === 'adj-past') return both(baseJa, baseReading, 1, 1, 'かった');
  }
  throw new Error(`Form ${form} does not apply to adjectives`);
}

export function canConjugate(pos: PartOfSpeech | undefined, form: ConjugationForm): boolean {
  if (!pos) return false;
  if (ADJ_FORMS.includes(form)) return pos === 'adj-i' || pos === 'adj-na';
  return pos === 'verb-godan' || pos === 'verb-ichidan' || pos === 'verb-suru' || pos === 'verb-kuru';
}

/** Dictionary form of a word (adds する to suru-nouns). */
export function dictionaryForm(ja: string, reading: string, pos: PartOfSpeech | undefined): Conjugated {
  if (pos === 'verb-suru' && !ja.endsWith('する')) return { ja: `${ja}する`, reading: `${reading}する` };
  return { ja, reading };
}

export function conjugate(ja: string, reading: string, pos: PartOfSpeech, form: ConjugationForm): Conjugated {
  switch (pos) {
    case 'verb-godan': return godan(ja, reading, form);
    case 'verb-ichidan': return ichidan(ja, reading, form);
    case 'verb-suru': return suru(ja, reading, form);
    case 'verb-kuru': return kuru(form);
    case 'adj-i':
    case 'adj-na': return adjective(ja, reading, pos, form);
    default: throw new Error(`Cannot conjugate part of speech ${pos}`);
  }
}

export interface ConjugationMistake {
  text: string;
  /** Why this is wrong, in one sentence. */
  why: string;
}

const TE_ENDINGS: Record<string, string> = {
  って: 'う, つ and る godan verbs', んで: 'む, ぶ and ぬ godan verbs', いて: 'く godan verbs', して: 'す godan verbs', て: 'ichidan verbs (drop る)',
  った: 'う, つ and る godan verbs', んだ: 'む, ぶ and ぬ godan verbs', いた: 'く godan verbs', した: 'す godan verbs', た: 'ichidan verbs (drop る)',
};

/**
 * Plausible wrong answers learners actually produce — the other verb class's
 * rule, the wrong godan sound change — each with the reason it is wrong.
 */
export function conjugationMistakes(ja: string, reading: string, pos: PartOfSpeech, form: ConjugationForm): ConjugationMistake[] {
  const right = conjugate(ja, reading, pos, form);
  const out = new Map<string, string>();
  const add = (text: string, why: string) => {
    if (!out.has(text)) out.set(text, why);
  };
  const stem = ja.slice(0, -1);
  const cls = pos === 'verb-godan' ? 'godan' : 'ichidan';
  const masuStem = () => godan(ja, reading, 'masu').ja.replace(/ます$/, '');
  if (pos === 'verb-godan' || pos === 'verb-ichidan') {
    if (form === 'te' || form === 'ta') {
      const endings = form === 'te' ? ['って', 'んで', 'いて', 'して', 'て'] : ['った', 'んだ', 'いた', 'した', 'た'];
      for (const s of endings) add(stem + s, `The ${s} ending belongs to ${TE_ENDINGS[s]}; ${ja} is a ${cls} verb ending in ${reading.slice(-1)}.`);
      if (pos === 'verb-godan') add(masuStem() + (form === 'te' ? 'て' : 'た'), `Godan verbs don't add ${form === 'te' ? 'て' : 'た'} to the ます-stem; the last sound changes instead.`);
    } else {
      const other = pos === 'verb-godan' ? ichidan(ja, reading, form).ja : safeGodan(ja, reading, form);
      if (other) {
        add(other, pos === 'verb-godan'
          ? `This treats ${ja} as an ichidan (drop-る) verb, but it is godan.`
          : `This treats ${ja} as a godan verb, but it is ichidan: just drop る.`);
      }
      if (form === 'nai') {
        add(`${stem}ない`, 'This drops the last kana; godan verbs change it to the あ-sound, ichidan verbs drop る.');
        add(`${ja}ない`, 'ない never attaches to the dictionary form.');
        if (pos === 'verb-godan') add(`${masuStem()}ない`, 'This uses the い-sound (ます-stem); ない needs the あ-sound.');
      }
      if (form === 'potential') {
        add(`${stem}られる`, pos === 'verb-godan' ? 'られる is the ichidan potential; godan verbs change to the え-sound + る.' : 'This drops the wrong part; ichidan potential is the stem (drop る) + られる.');
        add(`${stem}れる`, pos === 'verb-godan' ? 'This drops the last kana instead of changing it to the え-sound.' : 'This is the casual "ら-less" form; the standard potential is られる.');
        if (pos === 'verb-godan') add(`${masuStem()}られる`, 'The potential isn\'t built on the ます-stem.');
        else add(`${stem}させる`, 'させる is the causative ("make someone do"), not "can do".');
      }
      if (form === 'volitional') {
        add(`${stem}よう`, pos === 'verb-godan' ? 'よう is the ichidan volitional; godan verbs change to the お-sound + う.' : 'This drops the wrong part.');
        add(`${stem}おう`, pos === 'verb-godan' ? 'This adds おう instead of changing the last sound to the お-row.' : 'おう is not an ichidan ending; use よう.');
        if (pos === 'verb-godan') add(`${masuStem()}よう`, 'The volitional isn\'t built on the ます-stem.');
        else add(`${stem}ろう`, 'ろう is not an ending; ichidan verbs take よう.');
      }
      if (form === 'masu' || form === 'masen' || form === 'mashita') {
        const tail = form === 'masu' ? 'ます' : form === 'masen' ? 'ません' : 'ました';
        add(`${ja}${tail}`, `${tail} attaches to the ます-stem, not the dictionary form.`);
        add(`${stem}${tail}`, pos === 'verb-godan' ? 'This drops the last kana; godan verbs change it to the い-sound first.' : 'This drops the wrong part.');
      }
    }
  } else if (pos === 'verb-suru') {
    const base = ja.endsWith('する') ? ja.slice(0, -2) : ja;
    const alt: Partial<Record<ConjugationForm, string[]>> = {
      te: ['すて', 'しって', 'さて'], ta: ['すた', 'しった', 'さた'], nai: ['すない', 'さない', 'せない'],
      potential: ['すれる', 'しられる', 'される'], volitional: ['すよう', 'そう', 'さよう'],
      masu: ['すます', 'さます', 'せます'], masen: ['すません', 'さません', 'せません'], mashita: ['すました', 'さました', 'せました'],
    };
    for (const a of alt[form] ?? []) {
      add(base + a, a === 'される' ? 'される is the passive ("is done"); "can do" is できる.' : `する is irregular: the ${FORM_INFO[form].label} is ${right.ja.slice(base.length)}.`);
    }
  } else if (pos === 'verb-kuru') {
    const alt: Partial<Record<ConjugationForm, string[]>> = {
      te: ['来って', '来んで', 'くて'], ta: ['来った', '来んだ', 'くた'], nai: ['来らない', 'きない', 'くない'],
      potential: ['来れられる', '来える', 'くれる'], volitional: ['来おう', 'くろう', 'きよう'],
      masu: ['来ります', 'くます', 'こます'], masen: ['来りません', 'くません', 'こません'], mashita: ['来りました', 'くました', 'こました'],
    };
    for (const a of alt[form] ?? []) add(a, `来る is irregular: the ${FORM_INFO[form].label} is ${right.ja} (${right.reading}).`);
  } else if (pos === 'adj-i') {
    const s = ja.slice(0, -1);
    if (form === 'adj-negative') {
      add(`${ja}じゃない`, 'じゃない is for な-adjectives and nouns; い-adjectives use くない.');
      add(`${s}ない`, 'The く is missing: drop い and add くない.');
      add(`${ja}くない`, 'Drop the final い before adding くない.');
    } else {
      add(`${ja}だった`, 'だった is for な-adjectives and nouns; い-adjectives use かった.');
      add(`${s}だった`, 'い-adjectives form the past with かった, not だった.');
      add(`${ja}かった`, 'Drop the final い before adding かった.');
    }
  } else if (pos === 'adj-na') {
    if (form === 'adj-negative') {
      add(`${ja}くない`, 'くない is only for い-adjectives; な-adjectives use じゃない.');
      add(`${ja}ない`, 'な-adjectives need じゃ (or では) before ない.');
      add(`${ja}じゃなかった`, 'じゃなかった is the past negative ("was not").');
    } else {
      add(`${ja}かった`, 'かった is only for い-adjectives; な-adjectives use だった.');
      add(`${ja}じゃない`, 'じゃない is the negative ("is not"), not the past.');
      add(`${ja}なかった`, 'なかった is a negative ending; the past of a な-adjective is だった.');
    }
  }
  out.delete(right.ja);
  out.delete(right.reading);
  // ある's real negative is ない; never offer it as a mistake.
  if (reading === 'ある') out.delete('ない');
  return [...out].map(([text, why]) => ({ text, why }));
}

export function conjugationDistractors(ja: string, reading: string, pos: PartOfSpeech, form: ConjugationForm): string[] {
  return conjugationMistakes(ja, reading, pos, form).map((m) => m.text);
}

function safeGodan(ja: string, reading: string, form: ConjugationForm): string | null {
  try {
    return godan(ja, reading, form).ja;
  } catch {
    return null;
  }
}
