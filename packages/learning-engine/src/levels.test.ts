import { describe, expect, it } from 'vitest';
import { getLibrary } from '@jc/japanese-content';
import { jlptProgress } from './levels';
import { answerPlacement, bandForAbility, finishPlacement, nextPlacementQuestion, startPlacement } from './placement';

describe('jlptProgress', () => {
  it('reports progress through the next level not yet mastered', () => {
    expect(jlptProgress(0)).toEqual({ level: 'N5', percent: 0, mastered: false, kana: false });
    expect(jlptProgress(1.5)).toMatchObject({ level: 'N5', percent: 50 });
    expect(jlptProgress(3.0)).toMatchObject({ level: 'N4', percent: 0 });
    expect(jlptProgress(4.2)).toMatchObject({ level: 'N4', percent: 66 });
    expect(jlptProgress(9.39)).toMatchObject({ level: 'N1', percent: 99, mastered: false });
    expect(jlptProgress(9.4)).toEqual({ level: 'N1', percent: 100, mastered: true, kana: false });
    expect(jlptProgress(-1).percent).toBe(0);
  });

  it('never shows 100% before a level is mastered', () => {
    for (let a = 0; a < 9.4; a += 0.01) expect(jlptProgress(a).percent).toBeLessThan(100);
  });

  it('agrees with the estimated band', () => {
    for (const a of [1.2, 2.9, 3.1, 4.7, 5, 6.4, 7, 7.9, 8.5]) expect(jlptProgress(a).level).toBe(bandForAbility(a));
  });

  it('shows kana as mastered after a perfect kana run, whatever experience was chosen', () => {
    const lib = getLibrary();
    for (const exp of ['none', 'kana', 'beginner', 'intermediate', 'advanced'] as const) for (const seed of ['a', 'b', 'c', 'd']) {
      let s = nextPlacementQuestion(startPlacement(exp, 0, seed), lib);
      while (!s.finished && s.current) {
        const q = s.current;
        s = answerPlacement(s, q.placementSkill === 'hiragana' || q.placementSkill === 'katakana' ? q.answer : null).state;
        s = nextPlacementQuestion(s, lib);
      }
      const result = finishPlacement(s, lib, 1);
      for (const skill of ['hiragana', 'katakana'] as const) {
        const c = result.categories.find((x) => x.skill === skill)!;
        expect(c.correct).toBe(c.asked);
        expect(jlptProgress(c.ability, skill)).toMatchObject({ mastered: true, percent: 100, kana: true });
      }
    }
  });
});
