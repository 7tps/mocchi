import { useId, type ReactNode } from 'react';
import { formatMinutes, parseMinutes } from '@jc/shared-utils';

/** 8×8 pixel icons drawn with SVG rects so they match the sprite style. */
const ICONS: Record<string, string[]> = {
  home: ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.'],
  learn: ['........', '###..###', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '###..###', '........'],
  progress: ['.......#', '......##', '.....#.#', '..#.#..#', '.#.#...#', '#.......', '########', '........'],
  library: ['##.##.#.', '##.##.#.', '##.##.##', '##.##.##', '##.##.##', '##.##.##', '########', '........'],
  review: ['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..'],
  character: ['...##...', '..#..#..', '.######.', '#......#', '#.#..#.#', '#..##..#', '#......#', '.######.'],
  settings: ['...##...', '.#.##.#.', '..####..', '###..###', '###..###', '..####..', '.#.##.#.', '...##...'],
  about: ['..####..', '.#....#.', '#..##..#', '#......#', '#..##..#', '#..##..#', '.#....#.', '..####..'],
  close: ['#......#', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#....#.', '#......#'],
  minimize: ['........', '........', '........', '........', '........', '........', '########', '########'],
  maximize: ['########', '########', '#......#', '#......#', '#......#', '#......#', '#......#', '########'],
  restore: ['..######', '..######', '..#....#', '######.#', '######.#', '#....###', '#....#..', '######..'],
  clock: ['..####..', '.#....#.', '#...#..#', '#...#..#', '#...##.#', '#......#', '.#....#.', '..####..'],
  play: ['.#......', '.##.....', '.###....', '.####...', '.####...', '.###....', '.##.....', '.#......'],
  star: ['...#....', '...#....', '..###...', '#######.', '.#####..', '..###...', '.##.##..', '.#...#..'],
  flame: ['...#....', '..##....', '..###...', '.####.#.', '.######.', '########', '###..###', '.######.'],
};

export function PixelIcon({ name, size = 16, title }: { name: keyof typeof ICONS | string; size?: number; title?: string }) {
  const rows = ICONS[name] ?? ICONS.about!;
  return (
    <svg className="pixel-icon" width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}

export function Meter({ value, max = 1, label, variant }: { value: number; max?: number; label?: string; variant?: 'teal' }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={`meter ${variant ?? ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <label className="toggle" htmlFor={id}>
      <span>
        {label}
        {hint ? <span className="faint small" style={{ display: 'block' }}>{hint}</span> : null}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden />
    </label>
  );
}

export function Stepper({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
          −
        </button>
        <output aria-live="polite">{format ? format(value) : value}</output>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
          +
        </button>
      </div>
    </div>
  );
}

export function TimeField({ label, minutes, onChange }: { label: string; minutes: number; onChange: (m: number) => void }) {
  const id = useId();
  return (
    <span className="row">
      <label htmlFor={id} className="dim small">
        {label}
      </label>
      <input
        id={id}
        className="input"
        style={{ width: 110 }}
        type="time"
        value={formatMinutes(minutes)}
        onChange={(e) => {
          const m = parseMinutes(e.target.value);
          if (m !== null) onChange(m);
        }}
      />
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {sub ? <div className="faint small">{sub}</div> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="panel" role="alert" style={{ borderColor: 'var(--bad)' }}>
      {message}
    </div>
  );
}
