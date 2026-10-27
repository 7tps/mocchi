import { describe, expect, it } from 'vitest';
import { areaFor, clampToArea, placeNear, restoreRect } from './geometry';
import { ActivityTracker } from './activity';

const primary = { x: 0, y: 0, width: 1920, height: 1040 };
const secondary = { x: 1920, y: -200, width: 1280, height: 984 };

describe('window geometry', () => {
  it('keeps windows inside the work area', () => {
    expect(clampToArea({ x: 1900, y: 1030, width: 140, height: 150 }, primary)).toEqual({ x: 1780, y: 890, width: 140, height: 150 });
    expect(clampToArea({ x: -50, y: -10, width: 140, height: 150 }, primary)).toEqual({ x: 0, y: 0, width: 140, height: 150 });
  });

  it('assigns windows to the monitor they mostly overlap', () => {
    expect(areaFor({ x: 2000, y: 100, width: 140, height: 150 }, [primary, secondary])).toBe(secondary);
  });

  it('moves a saved position back on screen when its monitor is gone', () => {
    const saved = { x: 2500, y: 300, width: 140, height: 150 };
    const restored = restoreRect(saved, saved, [primary]);
    expect(restored.x + restored.width).toBeLessThanOrEqual(primary.width);
  });

  it('places the quiz beside the character without leaving the display', () => {
    const anchor = { x: 1760, y: 870, width: 140, height: 150 };
    const quiz = placeNear(anchor, { width: 400, height: 460 }, primary);
    expect(quiz.x + quiz.width).toBeLessThanOrEqual(anchor.x);
    expect(quiz.y).toBeGreaterThanOrEqual(0);
    // Character at the far left: the quiz goes to the right instead.
    const left = placeNear({ x: 0, y: 500, width: 140, height: 150 }, { width: 400, height: 460 }, primary);
    expect(left.x).toBeGreaterThanOrEqual(0);
    expect(left.x + left.width).toBeLessThanOrEqual(primary.width);
  });
});

describe('activity tracking', () => {
  it('counts active time and stops counting while idle', () => {
    const a = new ActivityTracker({ idleThresholdSec: 120 });
    let t = 0;
    for (let i = 0; i < 10; i++) a.tick((t += 60_000), 5);
    expect(a.activeMinutes()).toBe(9);
    for (let i = 0; i < 5; i++) a.tick((t += 60_000), 300 + i * 60);
    expect(a.activeMinutes()).toBe(9);
    expect(a.isIdle()).toBe(true);
    a.tick(t + 60_000, 1);
    expect(a.isIdle()).toBe(false);
  });

  it('ignores sleep gaps', () => {
    const a = new ActivityTracker();
    a.tick(0, 0);
    a.tick(8 * 3600_000, 0);
    expect(a.activeMinutes()).toBe(2);
    a.suspend();
    a.tick(9 * 3600_000, 0);
    expect(a.activeMinutes()).toBe(2);
  });
});
