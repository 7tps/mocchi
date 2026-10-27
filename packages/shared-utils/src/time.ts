/**
 * Timezone-aware calendar helpers built only on Intl, so they work in Node,
 * Electron, browsers and Hermes. All instants are epoch milliseconds.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function systemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localParts(ts: number, timeZone: string): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset (ms) of the zone from UTC at the given instant. */
export function zoneOffset(ts: number, timeZone: string): number {
  const p = localParts(ts, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (ts - (ts % 1000));
}

export function localDateKey(ts: number, timeZone: string): string {
  const p = localParts(ts, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function minutesOfDay(ts: number, timeZone: string): number {
  const p = localParts(ts, timeZone);
  return p.hour * 60 + p.minute;
}

function parseKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

/** Instant at which local wall-clock time `minutes` on `dateKey` occurs. */
export function localTimeToTs(dateKey: string, minutes: number, timeZone: string): number {
  const [y, m, d] = parseKey(dateKey);
  const naive = Date.UTC(y, m - 1, d, 0, minutes);
  // Two passes resolve DST transitions to the nearest valid instant.
  let ts = naive - zoneOffset(naive, timeZone);
  ts = naive - zoneOffset(ts, timeZone);
  return ts;
}

export function startOfLocalDay(ts: number, timeZone: string): number {
  return localTimeToTs(localDateKey(ts, timeZone), 0, timeZone);
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = parseKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function daysBetweenKeys(a: string, b: string): number {
  const [y1, m1, d1] = parseKey(a);
  const [y2, m2, d2] = parseKey(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY);
}

/** True if `minute` (since local midnight) falls inside a possibly overnight window. */
export function isWithinWindow(minute: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}
