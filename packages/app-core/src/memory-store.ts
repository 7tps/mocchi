import type { LearningProgress, LearningSession, PlacementResult, QuizAttempt } from '@jc/shared-types';
import type { TutorStore } from './store';

interface Snapshot {
  meta: Record<string, unknown>;
  progress: LearningProgress[];
  attempts: Array<[QuizAttempt, boolean]>;
  sessions: Array<[LearningSession, boolean]>;
  placements: Array<[PlacementResult, boolean]>;
}

/**
 * In-memory store with optional persistence callbacks (used by the browser
 * preview with localStorage, and by tests).
 */
export class MemoryTutorStore implements TutorStore {
  private meta = new Map<string, unknown>();
  private progress = new Map<string, LearningProgress>();
  private attempts = new Map<string, [QuizAttempt, boolean]>();
  private sessions = new Map<string, [LearningSession, boolean]>();
  private placements = new Map<string, [PlacementResult, boolean]>();

  constructor(private readonly persistence?: { load(): string | null; save(data: string): void }) {}

  async init(): Promise<void> {
    const raw = this.persistence?.load();
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Snapshot;
      this.meta = new Map(Object.entries(s.meta));
      this.progress = new Map(s.progress.map((p) => [p.itemId, p]));
      this.attempts = new Map(s.attempts.map((a) => [a[0].id, a]));
      this.sessions = new Map(s.sessions.map((a) => [a[0].id, a]));
      this.placements = new Map(s.placements.map((a) => [a[0].id, a]));
    } catch {
      // Corrupt snapshot: start fresh rather than crash.
    }
  }

  private save(): void {
    if (!this.persistence) return;
    const s: Snapshot = {
      meta: Object.fromEntries(this.meta),
      progress: [...this.progress.values()],
      attempts: [...this.attempts.values()],
      sessions: [...this.sessions.values()],
      placements: [...this.placements.values()],
    };
    this.persistence.save(JSON.stringify(s));
  }

  async getMeta<T>(key: string) {
    const v = this.meta.get(key);
    return v === undefined ? undefined : (structuredClone(v) as T);
  }
  async setMeta(key: string, value: unknown) {
    this.meta.set(key, structuredClone(value));
    this.save();
  }
  async deleteMeta(key: string) {
    this.meta.delete(key);
    this.save();
  }
  async getAllProgress() {
    return [...this.progress.values()].map((p) => ({ ...p }));
  }
  async putProgress(list: LearningProgress[]) {
    for (const p of list) this.progress.set(p.itemId, { ...p });
    this.save();
  }
  async replaceAllProgress(list: LearningProgress[]) {
    this.progress = new Map(list.map((p) => [p.itemId, { ...p }]));
    this.save();
  }
  async addAttempt(a: QuizAttempt, synced = false) {
    if (this.attempts.has(a.id)) return false;
    this.attempts.set(a.id, [{ ...a }, synced]);
    this.save();
    return true;
  }
  async getAttempts(opts: { since?: number } = {}) {
    return [...this.attempts.values()]
      .map(([a]) => a)
      .filter((a) => a.answeredAt >= (opts.since ?? 0))
      .sort((a, b) => a.answeredAt - b.answeredAt || (a.hlc < b.hlc ? -1 : 1));
  }
  async putSession(s: LearningSession, synced = false) {
    this.sessions.set(s.id, [{ ...s }, synced]);
    this.save();
  }
  async getSessions(opts: { since?: number } = {}) {
    return [...this.sessions.values()].map(([s]) => s).filter((s) => s.startedAt >= (opts.since ?? 0)).sort((a, b) => a.startedAt - b.startedAt);
  }
  async addPlacement(p: PlacementResult, synced = false) {
    if (this.placements.has(p.id)) return false;
    this.placements.set(p.id, [{ ...p }, synced]);
    this.save();
    return true;
  }
  async getPlacements() {
    return [...this.placements.values()].map(([p]) => p).sort((a, b) => a.takenAt - b.takenAt);
  }
  async getUnsynced() {
    return {
      attempts: [...this.attempts.values()].filter(([, s]) => !s).map(([a]) => a),
      sessions: [...this.sessions.values()].filter(([s, synced]) => !synced && s.completedAt).map(([s]) => s),
      placements: [...this.placements.values()].filter(([, s]) => !s).map(([p]) => p),
    };
  }
  async markSynced(ids: { attempts: string[]; sessions: string[]; placements: string[] }) {
    for (const id of ids.attempts) {
      const a = this.attempts.get(id);
      if (a) a[1] = true;
    }
    for (const id of ids.sessions) {
      const s = this.sessions.get(id);
      if (s) s[1] = true;
    }
    for (const id of ids.placements) {
      const p = this.placements.get(id);
      if (p) p[1] = true;
    }
    this.save();
  }
  async clearAll() {
    this.meta.clear();
    this.progress.clear();
    this.attempts.clear();
    this.sessions.clear();
    this.placements.clear();
    this.save();
  }
}
