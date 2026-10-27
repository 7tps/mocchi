import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { getRandomValues } from 'expo-crypto';
import type { SecretStore, SqlDriver, SqlValue } from '@jc/app-core';

// Hermes has no WebCrypto; createId() needs getRandomValues for stable sync IDs.
const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto?.getRandomValues) {
  g.crypto = { ...(g.crypto ?? {}), getRandomValues: getRandomValues as unknown };
}

/** SqlDriver over expo-sqlite (same schema and migrations as desktop). */
export class ExpoSqliteDriver implements SqlDriver {
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async open(name = 'mocchi.db'): Promise<ExpoSqliteDriver> {
    return new ExpoSqliteDriver(await SQLite.openDatabaseAsync(name));
  }

  async exec(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number }> {
    const r = await this.db.runAsync(sql, params);
    return { changes: r.changes };
  }

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, params);
  }

  async get<T>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    return (await this.db.getFirstAsync<T>(sql, params)) ?? undefined;
  }

  transaction<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      let out!: T;
      await this.db.withTransactionAsync(async () => {
        out = await fn();
      });
      return out;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

/** Sync credentials in the iOS Keychain / Android Keystore. */
export class SecureSecretStore implements SecretStore {
  private key(k: string) {
    return `mocchi.${k.replace(/[^A-Za-z0-9._-]/g, '_')}`;
  }
  get(key: string) {
    return SecureStore.getItemAsync(this.key(key));
  }
  set(key: string, value: string) {
    return SecureStore.setItemAsync(this.key(key), value);
  }
  delete(key: string) {
    return SecureStore.deleteItemAsync(this.key(key));
  }
}
