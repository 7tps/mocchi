import type { LearningItem, LearningStatus, Question, QuestionFormat, ResponseMode, Skill } from '@jc/shared-types';
import {
  CONFUSABLE_KANA,
  FORM_INFO,
  canConjugate,
  conjugate,
  conjugationMistakes,
  whyNotFor,
  type ConjugationForm,
  type ContentLibrary,
} from '@jc/japanese-content';
import { ROMAJI_VARIANTS, hasJapanese, isKanji, normalizeEnglish, pick, sample, shuffle, type Rng } from '@jc/shared-utils';

export interface QuestionContext {
  library: ContentLibrary;
  rng: Rng;
  /** Whether text-to-speech audio is available on this device. */
  listening?: boolean;
  /** Upper difficulty bound for words used in conjugation drills. */
  conjugationMaxDifficulty?: number;
  choiceCount?: number;
  /** Exercise ids to avoid (recently seen). */
  avoidExerciseIds?: ReadonlySet<string>;
}

const TYPED_FORMATS: ReadonlySet<QuestionFormat> = new Set([
  'kana-to-romaji', 'en-to-ja', 'word-to-reading', 'kanji-reading', 'conjugate', 'fill-particle', 'ja-to-en', 'kanji-meaning',
]);

/** Formats suitable for a first encounter (recognition before recall). */
const INTRO_FORMATS: ReadonlySet<QuestionFormat> = new Set([
  'kana-to-romaji', 'ja-to-en', 'kanji-meaning', 'fill-particle', 'fill-blank', 'conjugate', 'comprehension', 'choose-sentence',
]);

/** Formats whose answer *is* kanji knowledge, or that show readings anyway — no separate kanji load. */
const NO_KANJI_LOAD: ReadonlySet<QuestionFormat> = new Set(['kanji-meaning', 'kanji-reading', 'word-to-reading', 'conjugate', 'en-to-ja', 'kana-to-romaji', 'romaji-to-kana', 'listening']);

/** Kanji difficulty assumed for characters outside the bundled kanji list. */
const UNLISTED_KANJI_DIFFICULTY = 6;

function hasKanjiChar(s: string): boolean {
  return [...s].some(isKanji);
}

/** Difficulty of the hardest kanji in a text, or undefined if it has none. */
export function kanjiLoad(text: string, lib: ContentLibrary): number | undefined {
  let max: number | undefined;
  for (const ch of text) {
    if (!isKanji(ch) || ch === '々') continue;
    const d = lib.byId.get(`k:${ch}`)?.difficulty ?? UNLISTED_KANJI_DIFFICULTY;
    max = max === undefined ? d : Math.max(max, d);
  }
  return max;
}

export function formatsFor(item: LearningItem, ctx: Pick<QuestionContext, 'listening'>): QuestionFormat[] {
  switch (item.type) {
    case 'kana':
      return ['kana-to-romaji', 'romaji-to-kana'];
    case 'vocab': {
      const f: QuestionFormat[] = ['ja-to-en', 'en-to-ja'];
      if (hasKanjiChar(item.ja)) f.push('word-to-reading');
      if (item.examples.length) f.push('translation');
      if (ctx.listening) f.push('listening');
      return f;
    }
    case 'expression':
      return ctx.listening ? ['ja-to-en', 'en-to-ja', 'listening'] : ['ja-to-en', 'en-to-ja'];
    case 'kanji':
      return item.exercises?.length ? ['kanji-meaning', 'kanji-reading'] : ['kanji-meaning'];
    case 'grammar': {
      const kinds = new Set((item.exercises ?? []).map((e) => e.kind));
      const f: QuestionFormat[] = [];
      if (kinds.has('fill-blank')) f.push('fill-blank');
      if (kinds.has('choose-sentence')) f.push('choose-sentence');
      if (kinds.has('arrange')) f.push('arrange');
      return f;
    }
    case 'particle':
      return ['fill-particle'];
    case 'conjugation':
      return ['conjugate'];
    case 'reading':
      return ['comprehension'];
  }
}

export function skillForFormat(item: LearningItem, format: QuestionFormat): Skill {
  if (format === 'translation' || format === 'arrange') return 'sentences';
  if (format === 'listening') return 'listening';
  if (format === 'comprehension') return 'reading';
  return item.skills[0] ?? 'vocabulary';
}

/** Pick a format appropriate to how well the item is known. */
export function chooseFormat(item: LearningItem, status: LearningStatus, ctx: QuestionContext, avoid?: QuestionFormat): QuestionFormat | null {
  const all = formatsFor(item, ctx);
  if (!all.length) return null;
  let pool = status === 'new' ? all.filter((f) => INTRO_FORMATS.has(f)) : all;
  if (!pool.length) pool = all;
  if (avoid && pool.length > 1) pool = pool.filter((f) => f !== avoid);
  return pick(ctx.rng, pool);
}

export function chooseMode(format: QuestionFormat, status: LearningStatus, rng: Rng, typedRate = 0.55): ResponseMode {
  if (format === 'arrange') return 'arrange';
  if (!TYPED_FORMATS.has(format)) return 'choice';
  if (status === 'reviewing' || status === 'retained') return rng() < typedRate ? 'typed' : 'choice';
  if (status === 'learning' && format !== 'ja-to-en') return rng() < 0.25 ? 'typed' : 'choice';
  return 'choice';
}

function meaningSet(item: LearningItem): Set<string> {
  return new Set(item.meanings.map(normalizeEnglish));
}

function overlaps(a: LearningItem, b: LearningItem): boolean {
  const sa = meaningSet(a);
  return b.meanings.some((m) => sa.has(normalizeEnglish(m)));
}

/** Similar-difficulty items of the same type that cannot be confused with a correct answer. */
function distractorItems(
  target: LearningItem,
  ctx: QuestionContext,
  count: number,
  accept: (candidate: LearningItem) => boolean,
): LearningItem[] {
  const pool = ctx.library.items.filter((c) => c.id !== target.id && c.type === target.type && accept(c));
  const scored = pool.map((c) => {
    let score = Math.abs(c.difficulty - target.difficulty) + ctx.rng() * 1.5;
    if (target.partOfSpeech && c.partOfSpeech === target.partOfSpeech) score -= 0.8;
    if (target.tags.some((t) => c.tags.includes(t) && t !== 'loanword')) score -= 0.3;
    return { c, score };
  });
  scored.sort((a, b) => a.score - b.score);
  const picked: LearningItem[] = [];
  for (const { c } of scored) {
    if (picked.length >= count) break;
    if (picked.some((p) => overlaps(p, c) || p.ja === c.ja)) continue;
    picked.push(c);
  }
  return picked;
}

/** A wrong option together with the explanation shown if the learner picks it. */
interface Wrong {
  text: string;
  why?: string;
}

function finishChoices(rng: Rng, answer: string, wrong: Wrong[], hints?: Map<string, string>): Pick<Question, 'choices' | 'choiceHints' | 'choiceNotes'> {
  const notes: Record<string, string> = {};
  const texts: string[] = [];
  for (const w of wrong) {
    if (!w.text || w.text === answer || texts.includes(w.text)) continue;
    texts.push(w.text);
    if (w.why) notes[w.text] = w.why;
  }
  const choices = shuffle(rng, [answer, ...texts]);
  return { choices, choiceHints: hints ? choices.map((c) => hints.get(c) ?? '') : undefined, choiceNotes: notes };
}

function base(item: LearningItem, format: QuestionFormat, mode: ResponseMode, sub = ''): Pick<Question, 'id' | 'itemId' | 'format' | 'mode' | 'skill' | 'difficulty'> {
  return {
    id: `${item.id}|${format}${sub ? `|${sub}` : ''}`,
    itemId: item.id,
    format,
    mode,
    skill: skillForFormat(item, format),
    difficulty: item.difficulty,
  };
}

function kanaRomajiAccepted(romaji: string): string[] {
  return [romaji, ...(ROMAJI_VARIANTS[romaji] ?? [])];
}

function confusablesFor(kana: string): string[] {
  return CONFUSABLE_KANA.find((g) => g.includes(kana))?.filter((k) => k !== kana) ?? [];
}

function withReading(item: LearningItem): string {
  return item.reading && item.reading !== item.ja ? `${item.ja} (${item.reading})` : item.ja;
}

function vocabExplanation(item: LearningItem): string {
  const parts = [`${withReading(item)} means “${item.meanings.slice(0, 3).join('”, “')}”.`];
  if (item.notes) parts.push(item.notes);
  return parts.join(' ');
}

/** Notes for typed mistakes: any other item spelled this way. */
function typedMeaningNotes(target: LearningItem, lib: ContentLibrary): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const other of lib.items) {
    if (other.id === target.id || (other.type !== 'vocab' && other.type !== 'expression' && other.type !== 'kanji')) continue;
    if (overlaps(target, other)) continue;
    for (const m of other.meanings) notes[normalizeEnglish(m)] ??= `“${m}” is ${withReading(other)}.`;
  }
  return notes;
}

function typedJapaneseNotes(target: LearningItem, lib: ContentLibrary): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const other of lib.items) {
    if (other.id === target.id || (other.type !== 'vocab' && other.type !== 'expression')) continue;
    if (other.ja === target.ja || other.reading === target.reading) continue;
    const why = `${withReading(other)} means “${other.meanings[0]}”.`;
    notes[other.ja] ??= why;
    if (other.reading) notes[other.reading] ??= why;
  }
  return notes;
}

/**
 * Build a concrete question for an item. Returns null when the format cannot
 * be produced (e.g. not enough distractors in a custom library).
 */
export function buildQuestion(item: LearningItem, format: QuestionFormat, mode: ResponseMode, ctx: QuestionContext): Question | null {
  const q = buildRaw(item, format, mode, ctx);
  if (!q || NO_KANJI_LOAD.has(q.format)) return q;
  const text = [q.prompt, q.context ?? '', q.format === 'choose-sentence' ? (q.choices ?? []).join('') : ''].join('');
  const load = kanjiLoad(text, ctx.library);
  return load === undefined ? q : { ...q, kanjiDifficulty: load };
}

function buildRaw(item: LearningItem, format: QuestionFormat, mode: ResponseMode, ctx: QuestionContext): Question | null {
  const n = (ctx.choiceCount ?? 4) - 1;
  const rng = ctx.rng;
  const lib = ctx.library;
  switch (format) {
    case 'kana-to-romaji': {
      const romaji = item.romaji ?? item.meanings[0] ?? '';
      const confusable = confusablesFor(item.ja)
        .map((k) => lib.byId.get(`kana:${k}`))
        .filter((x): x is LearningItem => !!x);
      const others = distractorItems(item, ctx, n, (c) => c.skills[0] === item.skills[0] && c.romaji !== romaji);
      const wrong: Wrong[] = [...confusable, ...others]
        .filter((c) => c.romaji && c.romaji !== romaji)
        .slice(0, n)
        .map((c) => ({ text: c.romaji ?? '', why: `“${c.romaji}” is ${c.ja}${confusable.includes(c) ? ` — it looks a lot like ${item.ja}` : ''}.` }));
      // Typed romaji for any other kana of the same script.
      const typedNotes: Record<string, string> = {};
      for (const k of lib.bySkill.get(item.skills[0] ?? 'hiragana') ?? []) {
        if (k.type === 'kana' && k.romaji && k.romaji !== romaji) typedNotes[k.romaji] ??= `“${k.romaji}” is ${k.ja}.`;
      }
      const choices = mode === 'choice' ? finishChoices(rng, romaji, wrong) : { choiceNotes: typedNotes };
      return {
        ...base(item, format, mode),
        instruction: 'How is this kana read?',
        prompt: item.ja,
        answer: romaji,
        accepted: kanaRomajiAccepted(romaji),
        answerScript: 'romaji',
        explanation: `${item.ja} is read “${romaji}”.${item.notes ? ` ${item.notes}` : ''}`,
        ...choices,
      };
    }
    case 'romaji-to-kana': {
      const romaji = item.romaji ?? '';
      const confusable = confusablesFor(item.ja).map((k) => lib.byId.get(`kana:${k}`)).filter((x): x is LearningItem => !!x);
      const others = distractorItems(item, ctx, n, (c) => c.skills[0] === item.skills[0] && c.romaji !== romaji);
      const wrong: Wrong[] = [...confusable, ...others]
        .slice(0, n)
        .map((c) => ({ text: c.ja, why: `${c.ja} is read “${c.romaji}”${confusable.includes(c) ? ` — easy to mix up with ${item.ja}` : ''}.` }));
      if (wrong.length < 2) return null;
      return {
        ...base(item, format, 'choice'),
        instruction: `Which ${item.skills[0]} is “${romaji}”?`,
        prompt: romaji,
        answer: item.ja,
        accepted: [item.ja],
        answerScript: 'kana',
        explanation: `“${romaji}” is written ${item.ja} in ${item.skills[0]}.`,
        ...finishChoices(rng, item.ja, wrong),
      };
    }
    case 'ja-to-en':
    case 'listening': {
      const others = distractorItems(item, ctx, n, (c) => !overlaps(item, c));
      if (mode === 'choice' && others.length < 2) return null;
      const listening = format === 'listening';
      const wrong: Wrong[] = others.map((o) => ({ text: o.meanings[0] ?? '', why: `“${o.meanings[0]}” is ${withReading(o)}${listening ? '' : `, not ${item.ja}`}.` }));
      const choices = mode === 'choice' || listening ? finishChoices(rng, item.meanings[0] ?? '', wrong) : { choiceNotes: typedMeaningNotes(item, lib) };
      return {
        ...base(item, format, listening ? 'choice' : mode),
        instruction: listening ? 'Listen. What does it mean?' : 'What does this mean?',
        prompt: listening ? '' : item.ja,
        promptReading: !listening && item.reading !== item.ja ? item.reading : undefined,
        speak: item.reading || item.ja,
        answer: item.meanings[0] ?? '',
        accepted: item.meanings,
        answerScript: 'english',
        explanation: vocabExplanation(item),
        example: item.examples[0],
        ...choices,
      };
    }
    case 'en-to-ja': {
      const others = distractorItems(item, ctx, n, (c) => !overlaps(item, c) && c.reading !== item.reading);
      if (mode === 'choice' && others.length < 2) return null;
      const hints = new Map<string, string>();
      for (const c of [item, ...others]) if (c.reading !== c.ja) hints.set(c.ja, c.reading);
      const wrong: Wrong[] = others.map((o) => ({ text: o.ja, why: `${withReading(o)} means “${o.meanings[0]}”.` }));
      const choices = mode === 'choice' ? finishChoices(rng, item.ja, wrong, hints) : { choiceNotes: typedJapaneseNotes(item, lib) };
      return {
        ...base(item, format, mode),
        instruction: mode === 'typed' ? 'Write this in Japanese (kana or romaji is fine).' : 'Which word means this?',
        prompt: item.meanings[0] ?? '',
        promptSub: item.meanings.length > 1 ? `also: ${item.meanings.slice(1, 3).join(', ')}` : undefined,
        answer: item.ja,
        accepted: [...new Set([item.ja, item.reading])],
        answerScript: 'japanese',
        explanation: vocabExplanation(item),
        example: item.examples[0],
        ...choices,
      };
    }
    case 'word-to-reading': {
      const others = distractorItems(item, ctx, n, (c) => c.reading !== item.reading && hasKanjiChar(c.ja));
      const wrong: Wrong[] = others.map((o) => ({ text: o.reading, why: `${o.reading} is the reading of ${o.ja} (“${o.meanings[0]}”).` }));
      const typedNotes: Record<string, string> = {};
      for (const o of lib.items) if (o.type === 'vocab' && o.id !== item.id && o.reading !== item.reading) typedNotes[o.reading] ??= `${o.reading} is the reading of ${o.ja} (“${o.meanings[0]}”).`;
      return {
        ...base(item, format, mode),
        difficulty: item.difficulty + 0.3,
        instruction: 'How do you read this word?',
        prompt: item.ja,
        promptSub: item.meanings[0],
        answer: item.reading,
        accepted: [item.reading],
        answerScript: 'kana',
        explanation: vocabExplanation(item),
        example: item.examples[0],
        ...(mode === 'choice' ? finishChoices(rng, item.reading, wrong) : { choiceNotes: typedNotes }),
      };
    }
    case 'translation': {
      const ex = item.examples[0];
      if (!ex) return null;
      const wrong: Wrong[] = distractorItems(item, ctx, n, (c) => c.examples.length > 0).map((c) => ({
        text: c.examples[0]?.en ?? '',
        why: `That translates a different sentence: ${c.examples[0]?.ja} — the key word there is ${withReading(c)}.`,
      }));
      return {
        ...base(item, format, 'choice'),
        difficulty: item.difficulty + 0.4,
        instruction: 'What does this sentence mean?',
        prompt: ex.ja,
        promptReading: ex.reading,
        answer: ex.en,
        accepted: [ex.en],
        answerScript: 'english',
        explanation: `Key word: ${withReading(item)} — “${item.meanings[0]}”.`,
        example: ex,
        ...finishChoices(rng, ex.en, wrong),
      };
    }
    case 'kanji-meaning': {
      const others = distractorItems(item, ctx, n, (c) => !overlaps(item, c));
      const wrong: Wrong[] = others.map((o) => ({ text: o.meanings[0] ?? '', why: `“${o.meanings[0]}” is the kanji ${o.ja}.` }));
      return {
        ...base(item, format, mode),
        instruction: 'What does this kanji mean?',
        prompt: item.ja,
        answer: item.meanings[0] ?? '',
        accepted: item.meanings,
        answerScript: 'english',
        explanation: kanjiExplanation(item),
        example: item.examples[0],
        ...(mode === 'choice' ? finishChoices(rng, item.meanings[0] ?? '', wrong) : { choiceNotes: typedMeaningNotes(item, lib) }),
      };
    }
    case 'kanji-reading': {
      const compounds = item.exercises ?? [];
      if (!compounds.length) return null;
      const c = pick(rng, compounds);
      const wrong: Wrong[] = distractorItems(item, ctx, n * 2, (k) => (k.exercises?.length ?? 0) > 0)
        .map((k) => {
          const other = pick(rng, k.exercises ?? []);
          return { text: other.answer, why: `${other.answer} is how ${other.prompt} (“${other.promptEn}”) is read.` };
        })
        .filter((w) => w.text !== c.answer)
        .slice(0, n);
      const typedNotes: Record<string, string> = {};
      const readings = [...(item.onyomi ?? []), ...(item.kunyomi ?? [])].map((r) => r.replace('.', ''));
      for (const r of readings) typedNotes[r] = `${r} is a reading of ${item.ja}, but in ${c.prompt} it is read ${c.answer}.`;
      return {
        ...base(item, format, mode, c.id),
        difficulty: item.difficulty + 0.2,
        instruction: `How is this word with ${item.ja} read?`,
        prompt: c.prompt,
        promptSub: c.promptEn,
        answer: c.answer,
        accepted: [c.answer, ...(c.alsoAccept ?? [])],
        answerScript: 'kana',
        explanation: `${c.explanation}. ${kanjiExplanation(item)}`,
        example: item.examples[0],
        ...(mode === 'choice' ? finishChoices(rng, c.answer, wrong) : { choiceNotes: typedNotes }),
      };
    }
    case 'fill-particle':
    case 'fill-blank':
    case 'choose-sentence':
    case 'arrange':
    case 'comprehension': {
      const kind = format === 'fill-particle' ? 'fill-blank' : format;
      const pool = (item.exercises ?? []).filter((e) => e.kind === kind);
      if (!pool.length) return null;
      const fresh = pool.filter((e) => !ctx.avoidExerciseIds?.has(e.id));
      const e = pick(rng, fresh.length ? fresh : pool);
      const wrong: Wrong[] = (e.distractors ?? []).map((d) => ({
        text: d,
        why: format === 'comprehension' ? 'The passage doesn’t say that.' : whyNotFor(e.id, d),
      }));
      const common = {
        ...base(item, format, format === 'arrange' ? 'arrange' : mode, e.id),
        difficulty: e.difficulty ?? item.difficulty,
        answer: e.answer,
        accepted: [e.answer, ...(e.alsoAccept ?? [])],
        explanation: e.explanation,
        example: item.examples[0],
      };
      if (format === 'arrange') {
        let tokens = shuffle(rng, e.tokens ?? []);
        if (tokens.join('') === e.answer && tokens.length > 1) tokens = [...tokens.slice(1), tokens[0] as string];
        return { ...common, mode: 'arrange', instruction: 'Put the words in order:', prompt: e.prompt, tokens, answerScript: 'japanese' };
      }
      if (format === 'comprehension') {
        return {
          ...common,
          mode: 'choice',
          instruction: 'Read, then answer:',
          prompt: e.question ?? '',
          context: item.passage?.ja,
          contextReading: item.passage?.reading,
          contextEn: item.passage?.en,
          answerScript: 'english',
          ...finishChoices(rng, e.answer, wrong),
        };
      }
      if (format === 'choose-sentence') {
        return { ...common, mode: 'choice', instruction: e.prompt, prompt: '', answerScript: 'japanese', ...finishChoices(rng, e.answer, wrong) };
      }
      const typed = mode === 'typed' && format === 'fill-particle';
      const choices = finishChoices(rng, e.answer, wrong);
      return {
        ...common,
        mode: typed ? 'typed' : 'choice',
        instruction: format === 'fill-particle' ? 'Fill in the missing particle:' : 'Fill in the blank:',
        prompt: e.prompt,
        promptReading: e.promptReading,
        promptSub: e.promptEn,
        answerScript: 'kana',
        ...(typed ? { choiceNotes: choices.choiceNotes } : choices),
      };
    }
    case 'conjugate': {
      const form = (item.tags.find((t) => t !== 'conjugation') ?? 'masu') as ConjugationForm;
      const maxD = ctx.conjugationMaxDifficulty ?? 4;
      const words = lib.items.filter((w) => w.type === 'vocab' && canConjugate(w.partOfSpeech, form) && w.difficulty <= maxD);
      if (!words.length || !FORM_INFO[form]) return null;
      const w = pick(rng, words);
      const pos = w.partOfSpeech;
      if (!pos) return null;
      const dict = pos === 'verb-suru' && !w.ja.endsWith('する') ? { ja: `${w.ja}する`, reading: `${w.reading}する` } : { ja: w.ja, reading: w.reading };
      const right = conjugate(w.ja, w.reading, pos, form);
      const mistakes = conjugationMistakes(w.ja, w.reading, pos, form);
      // Kana versions of the same mistakes, for answers typed in kana or romaji.
      const kanaMistakes = w.reading !== w.ja && pos !== 'verb-kuru' ? conjugationMistakes(w.reading, w.reading, pos, form) : [];
      const typedNotes: Record<string, string> = {};
      for (const m of [...mistakes, ...kanaMistakes]) typedNotes[m.text] ??= m.why;
      const info = FORM_INFO[form];
      return {
        ...base(item, format, mode, w.id),
        difficulty: info.difficulty + Math.max(0, w.difficulty - 3) * 0.2,
        instruction: `Give the ${info.label} (${info.en}):`,
        prompt: dict.ja,
        promptReading: dict.reading !== dict.ja ? dict.reading : undefined,
        promptSub: w.meanings[0],
        answer: right.ja,
        accepted: [...new Set([right.ja, right.reading])],
        answerScript: 'japanese',
        explanation: `${dict.ja} → ${right.ja}${right.reading !== right.ja ? ` (${right.reading})` : ''}. ${info.explain}${w.notes && /form|godan|ichidan|irregular|negative/i.test(w.notes) ? ` ${w.notes}` : ''}`,
        ...(mode === 'choice' ? { ...finishChoices(rng, right.ja, sample(rng, mistakes, n)), choiceNotes: typedNotes } : { choiceNotes: typedNotes }),
      };
    }
  }
}

function kanjiExplanation(item: LearningItem): string {
  const on = item.onyomi?.length ? `On: ${item.onyomi.join('、')}` : '';
  const kun = item.kunyomi?.length ? `Kun: ${item.kunyomi.map((k) => k.replace('.', '（') + (k.includes('.') ? '）' : '')).join('、')}` : '';
  const meaning = `${item.ja} = ${item.meanings.join(', ')}.`;
  return [meaning, [on, kun].filter(Boolean).join(' · '), item.notes].filter(Boolean).join(' ');
}

export function isJapaneseAnswer(q: Question): boolean {
  return q.answerScript === 'kana' || q.answerScript === 'japanese' || hasJapanese(q.answer);
}
