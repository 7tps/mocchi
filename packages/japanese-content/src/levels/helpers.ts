import type { ContentExercise } from '@jc/shared-types';
import type { LevelExample } from '../packs';

/** Authoring helpers for level grammar: every distractor carries its "why not" note. */

export const ex = (ja: string, en: string, reading?: string): LevelExample => ({ ja, en, reading });

/** Fill-in-the-blank. `prompt` contains ＿＿; `wrong` maps each distractor to why it is wrong. */
export function fill(id: string, prompt: string, en: string, answer: string, wrong: Record<string, string>, explanation: string): ContentExercise {
  return { id, kind: 'fill-blank', prompt, promptEn: en, answer, distractors: Object.keys(wrong), distractorNotes: wrong, explanation };
}

/** Choose the correct sentence. `prompt` is the instruction shown to the learner. */
export function choose(id: string, prompt: string, answer: string, wrong: Record<string, string>, explanation: string): ContentExercise {
  return { id, kind: 'choose-sentence', prompt, answer, distractors: Object.keys(wrong), distractorNotes: wrong, explanation };
}

/** Put the words in order. `en` is the meaning shown as the prompt. */
export function arrange(id: string, en: string, tokens: string[], explanation: string): ContentExercise {
  return { id, kind: 'arrange', prompt: en, answer: tokens.join(''), tokens, explanation };
}

/** Comprehension question about a reading passage. */
export function ask(id: string, question: string, answer: string, wrong: Record<string, string>, explanation: string): ContentExercise {
  return { id, kind: 'comprehension', prompt: '', question, answer, distractors: Object.keys(wrong), distractorNotes: wrong, explanation };
}
