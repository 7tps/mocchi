import type { LearningProgress, LearningSession, PlacementResult, QuizAttempt } from '@jc/shared-types';

/** Persistence port. Implemented over SQLite (desktop, mobile, tests) and in memory (browser preview). */
export interface TutorStore {
  init(): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  deleteMeta(key: string): Promise<void>;

  getAllProgress(): Promise<LearningProgress[]>;
  putProgress(list: LearningProgress[]): Promise<void>;
  replaceAllProgress(list: LearningProgress[]): Promise<void>;

  /** Insert an attempt; returns false if the id already existed (idempotent). */
  addAttempt(a: QuizAttempt, synced?: boolean): Promise<boolean>;
  getAttempts(opts?: { since?: number }): Promise<QuizAttempt[]>;

  putSession(s: LearningSession, synced?: boolean): Promise<void>;
  getSessions(opts?: { since?: number }): Promise<LearningSession[]>;

  addPlacement(p: PlacementResult, synced?: boolean): Promise<boolean>;
  getPlacements(): Promise<PlacementResult[]>;

  getUnsynced(): Promise<{ attempts: QuizAttempt[]; sessions: LearningSession[]; placements: PlacementResult[] }>;
  markSynced(ids: { attempts: string[]; sessions: string[]; placements: string[] }): Promise<void>;

  clearAll(): Promise<void>;
}

/** Async SQL driver implemented by node:sqlite (desktop/tests) and expo-sqlite (mobile). */
export type SqlValue = string | number | null;

export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  all<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

/** Secret storage (OS keychain / encrypted file) for sync credentials. */
export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class MemorySecretStore implements SecretStore {
  private map = new Map<string, string>();
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}
