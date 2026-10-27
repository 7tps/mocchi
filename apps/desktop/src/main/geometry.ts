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

/** Transparent margins between a window's edges and what is actually drawn in it. */
export interface Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Place the character window so its *visible* sprite stays inside the work
 * area (the transparent margins may hang off-screen), snapping flush to an
 * edge when released within `snap` pixels of it.
 */
export function placeWidget(win: Rect, area: Rect, insets: Insets, snap = 16): Rect {
  const minX = area.x - insets.left;
  const maxX = area.x + area.width - win.width + insets.right;
  const minY = area.y - insets.top;
  const maxY = area.y + area.height - win.height + insets.bottom;
  let x = Math.min(Math.max(win.x, minX), maxX);
  let y = Math.min(Math.max(win.y, minY), maxY);
  if (x - minX <= snap) x = minX;
  else if (maxX - x <= snap) x = maxX;
  if (y - minY <= snap) y = minY;
  else if (maxY - y <= snap) y = maxY;
  return { x: Math.round(x), y: Math.round(y), width: win.width, height: win.height };
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

/** A context menu at the cursor: down-right if it fits, otherwise flipped left and/or up. */
export function placeMenu(cursor: Point, size: { width: number; height: number }, area: Rect): Rect {
  const x = cursor.x + size.width <= area.x + area.width ? cursor.x : cursor.x - size.width;
  const y = cursor.y + size.height <= area.y + area.height ? cursor.y : cursor.y - size.height;
  return clampToArea({ x, y, ...size }, area);
}

/** Default spot for the character: bottom-right of the primary work area. */
export function defaultWidgetRect(area: Rect, size: { width: number; height: number }): Rect {
  return { x: area.x + area.width - size.width - 24, y: area.y + area.height - size.height - 24, ...size };
}
