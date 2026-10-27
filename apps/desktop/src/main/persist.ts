import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SecretStore } from '@jc/app-core';
import type { Rect } from './geometry';

/** Device-local UI state (window positions) in a small JSON file, written atomically. */
export interface WindowState {
  widget?: Rect;
  quiz?: Rect;
  main?: Rect;
  quizMoved?: boolean;
}

const statePath = () => join(app.getPath('userData'), 'window-state.json');

export function loadWindowState(): WindowState {
  try {
    return JSON.parse(readFileSync(statePath(), 'utf8')) as WindowState;
  } catch {
    return {};
  }
}

export function saveWindowState(state: WindowState): void {
  const tmp = `${statePath()}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(state));
    renameSync(tmp, statePath());
  } catch {
    // Non-critical: positions fall back to defaults.
  }
}

/**
 * Sync credentials encrypted with the OS keychain via Electron safeStorage
 * (DPAPI on Windows, Keychain on macOS, libsecret on Linux). If encryption is
 * unavailable the token is kept in memory only and the user re-links later.
 */
export class SafeSecretStore implements SecretStore {
  private memory = new Map<string, string>();
  private readonly file = join(app.getPath('userData'), 'secrets.bin');

  private readAll(): Record<string, string> {
    if (!safeStorage.isEncryptionAvailable() || !existsSync(this.file)) return {};
    try {
      return JSON.parse(safeStorage.decryptString(readFileSync(this.file))) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, string>): void {
    if (!safeStorage.isEncryptionAvailable()) return;
    writeFileSync(this.file, safeStorage.encryptString(JSON.stringify(data)));
  }

  async get(key: string) {
    return this.readAll()[key] ?? this.memory.get(key) ?? null;
  }
  async set(key: string, value: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      this.memory.set(key, value);
      return;
    }
    this.writeAll({ ...this.readAll(), [key]: value });
  }
  async delete(key: string) {
    this.memory.delete(key);
    const all = this.readAll();
    delete all[key];
    this.writeAll(all);
  }
}
