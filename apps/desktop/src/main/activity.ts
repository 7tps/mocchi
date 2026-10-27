/**
 * Accumulates "eligible activity" minutes from the OS idle timer. Only the
 * system idle duration is read — never keystrokes, window titles or screen
 * contents. Pure and unit tested; Electron supplies the idle source.
 */
export interface ActivityOptions {
  /** Seconds without input after which the user counts as away. */
  idleThresholdSec: number;
}

export class ActivityTracker {
  private activeMs = 0;
  private lastTick: number | null = null;
  private idleSince: number | null = null;

  constructor(private readonly opts: ActivityOptions = { idleThresholdSec: 120 }) {}

  /** Record a tick. `idleSeconds` comes from powerMonitor.getSystemIdleTime(). */
  tick(now: number, idleSeconds: number): void {
    const idle = idleSeconds >= this.opts.idleThresholdSec;
    if (this.lastTick !== null && !idle) {
      // Ignore huge gaps (sleep/hibernate, clock jumps): count at most two minutes per tick.
      const delta = Math.min(Math.max(0, now - this.lastTick), 2 * 60_000);
      this.activeMs += delta;
    }
    if (idle && this.idleSince === null) this.idleSince = now - idleSeconds * 1000;
    if (!idle) this.idleSince = null;
    this.lastTick = now;
  }

  /** The machine slept or the screen locked: do not count that time. */
  suspend(): void {
    this.lastTick = null;
  }

  isIdle(): boolean {
    return this.idleSince !== null;
  }

  idleForMs(now: number): number {
    return this.idleSince === null ? 0 : now - this.idleSince;
  }

  activeMinutes(): number {
    return this.activeMs / 60_000;
  }

  reset(): void {
    this.activeMs = 0;
  }
}
