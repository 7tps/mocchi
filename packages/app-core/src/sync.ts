import type {
  AccountResponse,
  LinkCodeResponse,
  Platform,
  SyncRequest,
  SyncResponse,
  UserSettings,
} from '@jc/shared-types';
import { compareHlc } from '@jc/shared-utils';
import { DEVICE_LOCAL_SETTINGS } from './defaults';

export class SyncError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/** Thin HTTP client for services/api. All calls time out and map failures to SyncError. */
export class SyncClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike,
    private token: string | null = null,
    private readonly timeoutMs = 15_000,
  ) {}

  setToken(token: string | null): void {
    this.token = token;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    if (!/^https?:\/\//.test(url)) throw new SyncError('Sync server URL must start with http:// or https://');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), this.timeoutMs) : undefined;
    try {
      const res = await this.fetchImpl(url, {
        method,
        headers: { 'content-type': 'application/json', ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl?.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new SyncError(data.error ?? `Server responded ${res.status}`, res.status);
      return data as T;
    } catch (err) {
      if (err instanceof SyncError) throw err;
      throw new SyncError(err instanceof Error && err.name === 'AbortError' ? 'Sync timed out' : 'Sync server unreachable');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  createAccount(deviceId: string, platform: Platform): Promise<AccountResponse> {
    return this.call('POST', '/v1/accounts', { deviceId, platform });
  }
  link(code: string, deviceId: string, platform: Platform): Promise<AccountResponse> {
    return this.call('POST', '/v1/link', { code: code.trim().toUpperCase(), deviceId, platform });
  }
  linkCode(): Promise<LinkCodeResponse> {
    return this.call('POST', '/v1/link-code', {});
  }
  sync(req: SyncRequest): Promise<SyncResponse> {
    return this.call('POST', '/v1/sync', req);
  }
  deleteAccount(): Promise<{ deleted: boolean }> {
    return this.call('DELETE', '/v1/account');
  }
}

/**
 * Per-field last-writer-wins merge using HLC stamps (robust to clock skew).
 * Device-local settings are never taken from another device.
 */
export function mergeSettings(local: UserSettings, remote: Partial<UserSettings>): { merged: UserSettings; changed: boolean } {
  const merged: UserSettings = { ...local, updatedAt: { ...local.updatedAt } };
  let changed = false;
  const remoteStamps = remote.updatedAt ?? {};
  for (const key of Object.keys(remoteStamps) as Array<keyof UserSettings['updatedAt']>) {
    if (DEVICE_LOCAL_SETTINGS.includes(key)) continue;
    const rs = remoteStamps[key];
    const ls = local.updatedAt[key];
    if (!rs || !(key in remote)) continue;
    if (!ls || compareHlc(rs, ls) > 0) {
      (merged as unknown as Record<string, unknown>)[key] = (remote as Record<string, unknown>)[key];
      merged.updatedAt[key] = rs;
      changed = true;
    }
  }
  return { merged, changed };
}

/** Settings payload for sync: synced fields only. */
export function syncableSettings(s: UserSettings): Partial<UserSettings> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (!DEVICE_LOCAL_SETTINGS.includes(k as keyof UserSettings)) out[k] = v;
  out.updatedAt = Object.fromEntries(Object.entries(s.updatedAt).filter(([k]) => !DEVICE_LOCAL_SETTINGS.includes(k as keyof UserSettings)));
  return out as Partial<UserSettings>;
}
