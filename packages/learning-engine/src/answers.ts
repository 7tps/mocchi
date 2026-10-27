import type { AnswerCheck, Question } from '@jc/shared-types';
import {
  isKatakana,
  levenshtein,
  normalizeEnglish,
  normalizeJapanese,
  normalizeRomaji,
  romajiToHiragana,
  toHiragana,
} from '@jc/shared-utils';

const LATIN = /^[a-z' -]+$/i;

function typoTolerance(len: number): number {
  if (len >= 10) return 2;
  if (len >= 5) return 1;
  return 0;
}

function checkEnglish(q: Question, response: string): AnswerCheck {
  const r = normalizeEnglish(response);
  const accepted = q.accepted.map((a) => ({ raw: a, norm: normalizeEnglish(a) }));
  const exact = accepted.find((a) => a.norm === r);
  if (exact) {
    const note = exact.raw !== q.answer ? `Also correct: “${q.answer}”.` : undefined;
    return { correct: true, matched: exact.raw, note, normalizedResponse: r };
  }
  // Allow small spelling mistakes on longer words only, never on short ones
  // where one letter changes the meaning (cat / car).
  let best: { raw: string; d: number } | null = null;
  for (const a of accepted) {
    const d = levenshtein(r, a.norm);
    if (d <= typoTolerance(a.norm.length) && (!best || d < best.d)) best = { raw: a.raw, d };
  }
  if (best && r.length > 0) {
    return { correct: true, matched: best.raw, note: `Accepted with a typo — spelled “${best.raw}”.`, normalizedResponse: r };
  }
  return { correct: false, normalizedResponse: r };
}

/** Compare kana answers. Returns a note when the answer only differs by script. */
function kanaMatch(response: string, accepted: string[]): { matched: string; note?: string } | null {
  for (const a of accepted) {
    const na = normalizeJapanese(a);
    if (response === na) return { matched: a };
  }
  const rh = toHiragana(response);
  for (const a of accepted) {
    const na = normalizeJapanese(a);
    if (rh === toHiragana(na) && /[぀-ヿ]/.test(na)) {
      const expectsKatakana = [...na].some((c) => isKatakana(c) && c !== 'ー');
      return {
        matched: a,
        note: expectsKatakana ? `Right sound — it is usually written in katakana: ${a}.` : `Right reading — it is usually written in hiragana: ${a}.`,
      };
    }
  }
  return null;
}

function checkJapanese(q: Question, response: string): AnswerCheck {
  let r = normalizeJapanese(response);
  let viaRomaji = false;
  if (LATIN.test(r)) {
    const converted = romajiToHiragana(normalizeRomaji(r));
    if (!converted) return { correct: false, normalizedResponse: r, note: 'That romaji could not be read as Japanese.' };
    r = converted;
    viaRomaji = true;
  }
  const m = kanaMatch(r, q.accepted);
  if (m) {
    // Romaji input is converted to hiragana, so a katakana note would be noise.
    const note = viaRomaji ? (m.matched !== q.answer ? `Written: ${q.answer}` : undefined) : m.note;
    return { correct: true, matched: m.matched, note, normalizedResponse: r };
  }
  return { correct: false, normalizedResponse: r };
}

function checkRomaji(q: Question, response: string): AnswerCheck {
  const r = normalizeRomaji(response);
  const hit = q.accepted.find((a) => normalizeRomaji(a) === r);
  if (hit) {
    return { correct: true, matched: hit, note: hit !== q.answer ? `Standard spelling: “${q.answer}”.` : undefined, normalizedResponse: r };
  }
  return { correct: false, normalizedResponse: r };
}

/**
 * Check a learner response against a question's explicit accepted-answer
 * list. Never uses substring matching.
 */
export function checkAnswer(q: Question, response: string | string[]): AnswerCheck {
  if (Array.isArray(response)) {
    const joined = response.join('');
    return { correct: joined === q.answer, normalizedResponse: joined, matched: joined === q.answer ? q.answer : undefined };
  }
  if (!response.trim()) return { correct: false, normalizedResponse: '' };
  if (q.mode === 'choice') {
    const correct = response === q.answer;
    return { correct, matched: correct ? q.answer : undefined, normalizedResponse: response };
  }
  switch (q.answerScript) {
    case 'english':
      return checkEnglish(q, response);
    case 'romaji':
      return checkRomaji(q, response);
    case 'kana':
    case 'japanese':
      return checkJapanese(q, response);
  }
}

/**
 * Why the learner's specific answer is wrong (in addition to the explanation
 * of the right answer). Uses notes recorded when the question was built, then
 * normalised lookups for typed answers, then a near-miss check.
 */
export function explainWrong(q: Question, response: string | string[], check: AnswerCheck): string | undefined {
  if (check.correct) return undefined;
  if (Array.isArray(response)) {
    return `Your order (${response.join(' · ')}) isn’t grammatical: particles follow the word they mark, and the verb or です comes last.`;
  }
  const notes = q.choiceNotes ?? {};
  const raw = response.trim();
  const candidates = [raw, normalizeEnglish(raw), normalizeJapanese(raw), check.normalizedResponse, toHiragana(check.normalizedResponse), normalizeRomaji(raw)];
  for (const c of candidates) if (c && notes[c]) return notes[c];
  if (!raw) return undefined;
  switch (q.answerScript) {
    case 'english':
      return `“${raw}” isn’t one of the meanings of ${q.prompt}.`;
    case 'romaji':
      return `${q.prompt} isn’t read “${raw}”.`;
    default: {
      const r = toHiragana(check.normalizedResponse);
      const close = q.accepted.some((a) => {
        const na = toHiragana(normalizeJapanese(a));
        return na.length > 1 && levenshtein(r, na) === 1;
      });
      return close ? `Close — one kana is off (${check.normalizedResponse} vs ${q.answer}).` : `${check.normalizedResponse} isn’t the answer here.`;
    }
  }
}
