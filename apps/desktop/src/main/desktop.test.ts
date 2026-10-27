import { describe, expect, it } from 'vitest';
import { areaFor, clampToArea, placeMenu, placeNear, placeWidget, restoreRect } from './geometry';
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

describe('character placement', () => {
  const area = { x: 0, y: 0, width: 2048, height: 1232 };
  const insets = { left: 27, top: 52, right: 21, bottom: 3 };
  const size = { width: 132, height: 148 };

  it('lets the visible sprite sit flush against every edge (transparent margins hang off-screen)', () => {
    expect(placeWidget({ x: -500, y: 300, ...size }, area, insets)).toMatchObject({ x: -27 });
    expect(placeWidget({ x: 5000, y: 300, ...size }, area, insets)).toMatchObject({ x: 2048 - 132 + 21 });
    expect(placeWidget({ x: 400, y: -500, ...size }, area, insets)).toMatchObject({ y: -52 });
    expect(placeWidget({ x: 400, y: 5000, ...size }, area, insets)).toMatchObject({ y: 1232 - 148 + 3 });
  });

  it('snaps to an edge when released close to it, and leaves other positions alone', () => {
    expect(placeWidget({ x: -15, y: 600, ...size }, area, insets)).toMatchObject({ x: -27, y: 600 });
    expect(placeWidget({ x: 2048 - 132 + 21 - 10, y: 1232 - 148 + 3 - 12, ...size }, area, insets)).toMatchObject({ x: 1937, y: 1087 });
    expect(placeWidget({ x: 700, y: 600, ...size }, area, insets)).toEqual({ x: 700, y: 600, ...size });
    expect(placeWidget({ x: -15, y: 600, ...size }, area, insets, 0)).toMatchObject({ x: -15 });
  });

  it('never changes the window size', () => {
    expect(placeWidget({ x: 10, y: 10, width: 132, height: 148 }, area, insets)).toMatchObject(size);
  });
});

describe('context menu placement', () => {
  const area = { x: 0, y: 0, width: 2048, height: 1232 };
  const size = { width: 240, height: 300 };
  it('opens down-right of the cursor, flipping near the right or bottom edge', () => {
    expect(placeMenu({ x: 100, y: 100 }, size, area)).toMatchObject({ x: 100, y: 100 });
    expect(placeMenu({ x: 2000, y: 1200 }, size, area)).toMatchObject({ x: 1760, y: 900 });
  });
});
