/** Pure window-placement helpers (unit tested; no Electron imports). */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Keep a window fully inside a display's work area (taskbar/dock excluded). */
export function clampToArea(win: Rect, area: Rect): Rect {
  const width = Math.min(win.width, area.width);
  const height = Math.min(win.height, area.height);
  return {
    width,
    height,
    x: Math.round(Math.min(Math.max(win.x, area.x), area.x + area.width - width)),
    y: Math.round(Math.min(Math.max(win.y, area.y), area.y + area.height - height)),
  };
}

function overlap(a: Rect, b: Rect): number {
  const w = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return w * h;
}

/** The work area a window belongs to: most overlap, else nearest centre. */
export function areaFor(win: Rect, areas: Rect[]): Rect {
  if (!areas.length) return { x: 0, y: 0, width: 1280, height: 720 };
  let best = areas[0] as Rect;
  let bestOverlap = -1;
  for (const a of areas) {
    const o = overlap(win, a);
    if (o > bestOverlap) {
      best = a;
      bestOverlap = o;
    }
  }
  if (bestOverlap > 0) return best;
  const cx = win.x + win.width / 2;
  const cy = win.y + win.height / 2;
  return areas.reduce((a, b) => {
    const da = Math.hypot(a.x + a.width / 2 - cx, a.y + a.height / 2 - cy);
    const db = Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy);
    return db < da ? b : a;
  });
}

/** Restore a saved position onto the current displays (handles unplugged monitors). */
export function restoreRect(saved: Rect | undefined, fallback: Rect, areas: Rect[]): Rect {
  const r = saved ?? fallback;
  return clampToArea(r, areaFor(r, areas));
}

/**
 * Place the quiz next to the character: prefer the left side, then above,
 * then right, choosing whichever fits on the character's display.
 */
export function placeNear(anchor: Rect, size: { width: number; height: number }, area: Rect, gap = 8): Rect {
  const candidates: Rect[] = [
    { x: anchor.x - size.width - gap, y: anchor.y + anchor.height - size.height, ...size },
    { x: anchor.x + anchor.width / 2 - size.width / 2, y: anchor.y - size.height - gap, ...size },
    { x: anchor.x + anchor.width + gap, y: anchor.y + anchor.height - size.height, ...size },
    { x: anchor.x + anchor.width / 2 - size.width / 2, y: anchor.y + anchor.height + gap, ...size },
  ];
  const fits = candidates.find((c) => c.x >= area.x && c.y >= area.y && c.x + c.width <= area.x + area.width && c.y + c.height <= area.y + area.height);
  return clampToArea(fits ?? (candidates[0] as Rect), area);
}

/** Default spot for the character: bottom-right of the primary work area. */
export function defaultWidgetRect(area: Rect, size: { width: number; height: number }): Rect {
  return { x: area.x + area.width - size.width - 24, y: area.y + area.height - size.height - 24, ...size };
}
