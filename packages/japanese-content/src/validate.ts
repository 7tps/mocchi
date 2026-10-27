import { z } from 'zod';
import { SKILLS, type LearningItem } from '@jc/shared-types';
import { isKanaString, normalizeJapanese } from '@jc/shared-utils';

const example = z.object({ ja: z.string().min(1), reading: z.string().min(1), en: z.string().min(1) });

const exercise = z.object({
  id: z.string().min(1),
  kind: z.enum(['fill-blank', 'choose-sentence', 'arrange', 'comprehension']),
  prompt: z.string(),
  promptReading: z.string().optional(),
  promptEn: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().min(1),
  alsoAccept: z.array(z.string()).optional(),
  distractors: z.array(z.string()).optional(),
  tokens: z.array(z.string()).optional(),
  explanation: z.string().min(1),
  difficulty: z.number().min(0).max(10).optional(),
});

export const learningItemSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(['kana', 'vocab', 'kanji', 'grammar', 'particle', 'conjugation', 'expression', 'reading']),
  ja: z.string().min(1),
  reading: z.string(),
  romaji: z.string().optional(),
  meanings: z.array(z.string().min(1)).min(1),
  partOfSpeech: z
    .enum([
      'noun', 'pronoun', 'verb-godan', 'verb-ichidan', 'verb-suru', 'verb-kuru', 'adj-i', 'adj-na', 'adverb',
      'counter', 'expression', 'particle', 'conjunction', 'number', 'prefix', 'suffix', 'interjection',
    ])
    .optional(),
  examples: z.array(example),
  difficulty: z.number().min(0).max(10),
  jlpt: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
  skills: z.array(z.enum(SKILLS)).min(1),
  tags: z.array(z.string()),
  order: z.number(),
  importance: z.number().min(0).max(1),
  notes: z.string().optional(),
  audio: z.string().optional(),
  source: z.object({ id: z.string().min(1), license: z.string().min(1), attribution: z.string().optional() }),
  onyomi: z.array(z.string()).optional(),
  kunyomi: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  relatedVocab: z.array(z.string()).optional(),
  formation: z.string().optional(),
  commonMistakes: z.array(z.string()).optional(),
  confusedWith: z.array(z.string()).optional(),
  exercises: z.array(exercise).optional(),
  passage: example.optional(),
});

export const contentPackSchema = z.object({
  format: z.literal('jc-content-pack'),
  version: z.literal(1),
  name: z.string().min(1),
  source: z.object({ id: z.string().min(1), license: z.string().min(1), attribution: z.string().optional() }),
  items: z.array(learningItemSchema.omit({ source: true }).extend({ source: learningItemSchema.shape.source.optional() })),
});

export interface ValidationIssue {
  itemId: string;
  message: string;
}

const READING_CHARS = /^[぀-ヿー・、。！？「」『』\s0-9０-９A-Za-z]*$/u;

/** Semantic checks that a schema cannot express. */
export function validateItems(items: LearningItem[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const item of items) {
    const push = (message: string) => issues.push({ itemId: item.id, message });
    if (ids.has(item.id)) push('duplicate id');
    ids.add(item.id);
    const parsed = learningItemSchema.safeParse(item);
    if (!parsed.success) push(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    if ((item.type === 'vocab' || item.type === 'expression') && !isKanaString(item.reading.replace(/[、。！？\s]/g, ''))) {
      push(`reading "${item.reading}" is not kana`);
    }
    for (const ex of item.examples) {
      if (!READING_CHARS.test(ex.reading)) push(`example reading contains non-kana: ${ex.reading}`);
    }
    for (const e of item.exercises ?? []) {
      if (e.distractors?.some((d) => normalizeJapanese(d) === normalizeJapanese(e.answer))) push(`exercise ${e.id}: answer listed as distractor`);
      if (e.distractors && new Set(e.distractors).size !== e.distractors.length) push(`exercise ${e.id}: duplicate distractors`);
      if (e.kind === 'arrange') {
        if (!e.tokens || e.tokens.length < 2) push(`exercise ${e.id}: arrange needs tokens`);
        else if (e.tokens.join('') !== e.answer) push(`exercise ${e.id}: tokens do not join to the answer`);
      }
      if (e.kind === 'fill-blank' && item.type !== 'kanji' && !e.prompt.includes('＿＿')) push(`exercise ${e.id}: fill-blank prompt lacks ＿＿`);
      if ((e.kind === 'fill-blank' || e.kind === 'choose-sentence' || e.kind === 'comprehension') && item.type !== 'kanji' && (e.distractors?.length ?? 0) < 2) {
        push(`exercise ${e.id}: needs at least two distractors`);
      }
    }
  }
  return issues;
}

export interface ImportResult {
  items: LearningItem[];
  issues: ValidationIssue[];
}

/**
 * Validate and normalise an external content pack (e.g. converted from an
 * openly licensed dictionary). Items that fail validation are rejected
 * individually; attribution from the pack is attached to every item.
 */
export function importContentPack(json: unknown, existingIds: ReadonlySet<string> = new Set()): ImportResult {
  const pack = contentPackSchema.safeParse(json);
  if (!pack.success) {
    return { items: [], issues: [{ itemId: '(pack)', message: pack.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }] };
  }
  const prefix = `x:${pack.data.source.id}:`;
  const items: LearningItem[] = pack.data.items.map((raw) => ({
    ...raw,
    id: raw.id.startsWith('x:') ? raw.id : prefix + raw.id,
    ja: raw.ja.normalize('NFKC'),
    reading: raw.reading.normalize('NFKC'),
    source: raw.source ?? pack.data.source,
  }));
  const issues = validateItems(items);
  const bad = new Set(issues.map((i) => i.itemId));
  for (const item of items) if (existingIds.has(item.id)) {
    issues.push({ itemId: item.id, message: 'id already exists in library' });
    bad.add(item.id);
  }
  return { items: items.filter((i) => !bad.has(i.id)), issues };
}
