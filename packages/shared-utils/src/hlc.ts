/**
 * Hybrid logical clock. Stamps sort lexicographically in causal order and
 * tolerate moderate clock skew between devices: a device that receives a
 * stamp from the future advances its own logical time past it, so later
 * local edits still win over what it has seen.
 */

const PAD_TIME = 15;
const PAD_COUNT = 5;
/** Remote stamps further ahead than this are clamped (a badly wrong clock). */
const MAX_DRIFT_MS = 24 * 60 * 60 * 1000;

export interface HlcState {
  time: number;
  count: number;
  node: string;
}

export function formatHlc(state: HlcState): string {
  return `${String(state.time).padStart(PAD_TIME, '0')}:${String(state.count).padStart(PAD_COUNT, '0')}:${state.node}`;
}

export function parseHlc(stamp: string): HlcState {
  const [time, count, ...node] = stamp.split(':');
  return { time: Number(time), count: Number(count), node: node.join(':') };
}

export function compareHlc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class HybridClock {
  private state: HlcState;

  constructor(
    node: string,
    private readonly wallClock: () => number = Date.now,
    initial?: string,
  ) {
    this.state = initial ? { ...parseHlc(initial), node } : { time: 0, count: 0, node };
  }

  now(): string {
    const wall = this.wallClock();
    if (wall > this.state.time) {
      this.state = { time: wall, count: 0, node: this.state.node };
    } else {
      this.state = { ...this.state, count: this.state.count + 1 };
    }
    return formatHlc(this.state);
  }

  /** Merge a stamp received from another device. */
  receive(stamp: string): void {
    const remote = parseHlc(stamp);
    const wall = this.wallClock();
    const remoteTime = Math.min(remote.time, wall + MAX_DRIFT_MS);
    const time = Math.max(wall, this.state.time, remoteTime);
    let count = 0;
    if (time === this.state.time && time === remoteTime) count = Math.max(this.state.count, remote.count) + 1;
    else if (time === this.state.time) count = this.state.count + 1;
    else if (time === remoteTime) count = remote.count + 1;
    this.state = { time, count, node: this.state.node };
  }

  current(): string {
    return formatHlc(this.state);
  }
}
