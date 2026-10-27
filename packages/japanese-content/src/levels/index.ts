import type { JlptBand } from '@jc/shared-types';
import type { LevelGrammar, LevelReading } from '../packs';
import { GRAMMAR_N4 } from './grammar-n4';
import { GRAMMAR_N4B } from './grammar-n4b';
import { GRAMMAR_N3 } from './grammar-n3';
import { GRAMMAR_N2 } from './grammar-n2';
import { GRAMMAR_N1 } from './grammar-n1';
import { READINGS_BY_LEVEL } from './readings';

/** Hand-written grammar per level pack (the bundled curriculum's grammar is separate). */
export const LEVEL_GRAMMAR: Record<JlptBand, LevelGrammar[]> = {
  N5: [],
  N4: [...GRAMMAR_N4, ...GRAMMAR_N4B],
  N3: GRAMMAR_N3,
  N2: GRAMMAR_N2,
  N1: GRAMMAR_N1,
};

/** Hand-written reading passages per level pack. */
export const LEVEL_READINGS: Record<JlptBand, LevelReading[]> = {
  N5: [],
  N4: READINGS_BY_LEVEL.N4,
  N3: READINGS_BY_LEVEL.N3,
  N2: READINGS_BY_LEVEL.N2,
  N1: READINGS_BY_LEVEL.N1,
};
