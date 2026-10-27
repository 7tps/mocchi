import type { LearningProgress, LearningSession, PlacementResult, QuizAttempt } from '@jc/shared-types';
import type { SqlDriver, TutorStore } from './store';

/**
 * Versioned schema. Each migration runs once inside a transaction and bumps
 * PRAGMA user_version. Rows keep the full JSON document plus indexed columns
 * used for queries, so new optional fields need no migration.
 */
export const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learning_progress (
        item_id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('new','learning','reviewing','retained','relearning')),
        next_review_at INTEGER NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_progress_next ON learning_progress (next_review_at);
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        answered_at INTEGER NOT NULL,
        hlc TEXT NOT NULL,
        correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
        synced INTEGER NOT NULL DEFAULT 0 CHECK (synced IN (0, 1)),
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_attempts_item ON quiz_attempts (item_id);
      CREATE INDEX IF NOT EXISTS idx_attempts_time ON quiz_attempts (answered_at);
      CREATE INDEX IF NOT EXISTS idx_attempts_unsynced ON quiz_attempts (synced) WHERE synced = 0;
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        started_at INTEGER NOT NULL,
        local_date TEXT NOT NULL,
        completed_at INTEGER,
        synced INTEGER NOT NULL DEFAULT 0 CHECK (synced IN (0, 1)),
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_start ON learning_sessions (started_at);
      CREATE TABLE IF NOT EXISTS placement_results (
        id TEXT PRIMARY KEY NOT NULL,
        taken_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0 CHECK (synced IN (0, 1)),
        data TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export class MigrationError extends Error {
  constructor(public readonly version: number, cause: unknown) {
    super(`Database migration ${version} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

export async function migrate(db: SqlDriver): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  if (current > LATEST_SCHEMA_VERSION) {
    throw new MigrationError(current, new Error('database was created by a newer version of the app'));
  }
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    try {
      await db.transaction(async () => {
        await db.exec(m.sql);
        await db.exec(`PRAGMA user_version = ${m.version}`);
      });
      current = m.version;
    } catch (err) {
      throw new MigrationError(m.version, err);
    }
  }
  return current;
}

const parse = <T>(row: { data: string }): T => JSON.parse(row.data) as T;

export class SqliteTutorStore implements TutorStore {
  constructor(private readonly db: SqlDriver) {}

  async init(): Promise<void> {
    await this.db.exec('PRAGMA journal_mode = WAL;').catch(() => undefined);
    await migrate(this.db);
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    const row = await this.db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
    return row ? (JSON.parse(row.value) as T) : undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, JSON.stringify(value)]);
  }

  async deleteMeta(key: string): Promise<void> {
    await this.db.run('DELETE FROM meta WHERE key = ?', [key]);
  }

  async getAllProgress(): Promise<LearningProgress[]> {
    return (await this.db.all<{ data: string }>('SELECT data FROM learning_progress')).map((r) => parse<LearningProgress>(r));
  }

  async putProgress(list: LearningProgress[]): Promise<void> {
    if (!list.length) return;
    await this.db.transaction(async () => {
      for (const p of list) {
        await this.db.run(
          'INSERT INTO learning_progress (item_id, status, next_review_at, data) VALUES (?, ?, ?, ?) ON CONFLICT(item_id) DO UPDATE SET status = excluded.status, next_review_at = excluded.next_review_at, data = excluded.data',
          [p.itemId, p.status, Math.round(p.nextReviewAt), JSON.stringify(p)],
        );
      }
    });
  }

  async replaceAllProgress(list: LearningProgress[]): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM learning_progress');
      for (const p of list) {
        await this.db.run('INSERT INTO learning_progress (item_id, status, next_review_at, data) VALUES (?, ?, ?, ?)', [p.itemId, p.status, Math.round(p.nextReviewAt), JSON.stringify(p)]);
      }
    });
  }

  async addAttempt(a: QuizAttempt, synced = false): Promise<boolean> {
    const r = await this.db.run(
      'INSERT OR IGNORE INTO quiz_attempts (id, session_id, item_id, answered_at, hlc, correct, synced, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.sessionId, a.itemId, a.answeredAt, a.hlc, a.correct ? 1 : 0, synced ? 1 : 0, JSON.stringify(a)],
    );
    return r.changes > 0;
  }

  async getAttempts(opts: { since?: number } = {}): Promise<QuizAttempt[]> {
    const rows = await this.db.all<{ data: string }>('SELECT data FROM quiz_attempts WHERE answered_at >= ? ORDER BY answered_at, hlc, id', [opts.since ?? 0]);
    return rows.map((r) => parse<QuizAttempt>(r));
  }

  async putSession(s: LearningSession, synced = false): Promise<void> {
    await this.db.run(
      'INSERT INTO learning_sessions (id, started_at, local_date, completed_at, synced, data) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET completed_at = excluded.completed_at, synced = excluded.synced, data = excluded.data',
      [s.id, s.startedAt, s.localDate, s.completedAt ?? null, synced ? 1 : 0, JSON.stringify(s)],
    );
  }

  async getSessions(opts: { since?: number } = {}): Promise<LearningSession[]> {
    const rows = await this.db.all<{ data: string }>('SELECT data FROM learning_sessions WHERE started_at >= ? ORDER BY started_at', [opts.since ?? 0]);
    return rows.map((r) => parse<LearningSession>(r));
  }

  async addPlacement(p: PlacementResult, synced = false): Promise<boolean> {
    const r = await this.db.run('INSERT OR IGNORE INTO placement_results (id, taken_at, synced, data) VALUES (?, ?, ?, ?)', [p.id, p.takenAt, synced ? 1 : 0, JSON.stringify(p)]);
    return r.changes > 0;
  }

  async getPlacements(): Promise<PlacementResult[]> {
    return (await this.db.all<{ data: string }>('SELECT data FROM placement_results ORDER BY taken_at')).map((r) => parse<PlacementResult>(r));
  }

  async getUnsynced() {
    const [attempts, sessions, placements] = await Promise.all([
      this.db.all<{ data: string }>('SELECT data FROM quiz_attempts WHERE synced = 0 ORDER BY answered_at LIMIT 2000'),
      this.db.all<{ data: string }>('SELECT data FROM learning_sessions WHERE synced = 0 AND completed_at IS NOT NULL'),
      this.db.all<{ data: string }>('SELECT data FROM placement_results WHERE synced = 0'),
    ]);
    return {
      attempts: attempts.map((r) => parse<QuizAttempt>(r)),
      sessions: sessions.map((r) => parse<LearningSession>(r)),
      placements: placements.map((r) => parse<PlacementResult>(r)),
    };
  }

  async markSynced(ids: { attempts: string[]; sessions: string[]; placements: string[] }): Promise<void> {
    await this.db.transaction(async () => {
      for (const id of ids.attempts) await this.db.run('UPDATE quiz_attempts SET synced = 1 WHERE id = ?', [id]);
      for (const id of ids.sessions) await this.db.run('UPDATE learning_sessions SET synced = 1 WHERE id = ?', [id]);
      for (const id of ids.placements) await this.db.run('UPDATE placement_results SET synced = 1 WHERE id = ?', [id]);
    });
  }

  async clearAll(): Promise<void> {
    await this.db.transaction(async () => {
      for (const t of ['meta', 'learning_progress', 'quiz_attempts', 'learning_sessions', 'placement_results']) await this.db.run(`DELETE FROM ${t}`);
    });
  }
}
