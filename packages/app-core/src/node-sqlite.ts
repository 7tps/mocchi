import { DatabaseSync } from 'node:sqlite';
import type { SqlDriver, SqlValue } from './store';

/**
 * SqlDriver over Node's built-in SQLite (Node ≥ 22.13, Electron ≥ 35).
 * No native module to rebuild for Electron. Transactions are serialised with
 * a promise queue because the async API can interleave callers.
 */
export class NodeSqliteDriver implements SqlDriver {
  private readonly db: DatabaseSync;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number }> {
    const r = this.db.prepare(sql).run(...params);
    return { changes: Number(r.changes) };
  }

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async get<T>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      this.db.exec('BEGIN');
      try {
        const out = await fn();
        this.db.exec('COMMIT');
        return out;
      } catch (err) {
        try {
          this.db.exec('ROLLBACK');
        } catch {
          // already rolled back
        }
        throw err;
      }
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  close(): void {
    this.db.close();
  }
}
