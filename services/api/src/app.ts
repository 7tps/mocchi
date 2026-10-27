import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { SCHEMA_VERSION, type SyncEvent, type SyncResponse } from '@jc/shared-types';
import { createId, createLinkCode } from '@jc/shared-utils';

/**
 * Minimal sync service: anonymous accounts, device linking with short codes,
 * and an append-only event log per user. Events are idempotent by id, so
 * clients can safely retry. Learning state is derived on devices.
 */

const MAX_BODY = 5 * 1024 * 1024;
const PAGE = 500;
const LINK_CODE_TTL = 15 * 60 * 1000;

const platform = z.enum(['desktop', 'mobile', 'web']);
const accountBody = z.object({ deviceId: z.string().min(8).max(64), platform });
const linkBody = z.object({ code: z.string().min(6).max(12), deviceId: z.string().min(8).max(64), platform });
const event = z.object({
  type: z.enum(['attempt', 'session', 'placement', 'settings', 'profile']),
  id: z.string().min(1).max(120),
  hlc: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()),
});
const syncBody = z.object({
  schemaVersion: z.number().int().min(1),
  deviceId: z.string().min(8).max(64),
  cursor: z.number().int().min(0),
  events: z.array(event).max(5000),
});

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tokens (
    token_hash TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens (user_id);
  CREATE TABLE IF NOT EXISTS link_codes (
    code TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    type TEXT NOT NULL,
    hlc TEXT NOT NULL,
    device_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    received_at INTEGER NOT NULL,
    UNIQUE (user_id, id)
  );
  CREATE INDEX IF NOT EXISTS idx_events_user_seq ON events (user_id, seq);
`;

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'Request body too large');
    chunks.push(chunk as Buffer);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, `Invalid request: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  return r.data;
}

export interface ApiOptions {
  dbPath: string;
  now?: () => number;
  /** Allowed CORS origin for the browser preview; '*' in development. */
  corsOrigin?: string;
  log?: (msg: string) => void;
}

export function createApi(opts: ApiOptions): { server: Server; db: DatabaseSync; close(): Promise<void> } {
  const db = new DatabaseSync(opts.dbPath);
  db.exec(SCHEMA);
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => undefined);

  const issueToken = (userId: string, deviceId: string, plat: string) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO tokens (token_hash, user_id, device_id, platform, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)').run(hash(token), userId, deviceId, plat, now(), now());
    return token;
  };

  const auth = (req: IncomingMessage): { userId: string } => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'Missing token');
    const row = db.prepare('SELECT user_id FROM tokens WHERE token_hash = ?').get(hash(token)) as { user_id: string } | undefined;
    if (!row) throw new HttpError(401, 'Invalid or expired token');
    db.prepare('UPDATE tokens SET last_seen_at = ? WHERE token_hash = ?').run(now(), hash(token));
    return { userId: row.user_id };
  };

  const routes: Record<string, (req: IncomingMessage) => Promise<unknown>> = {
    'GET /health': async () => ({ ok: true, schemaVersion: SCHEMA_VERSION }),

    'POST /v1/accounts': async (req) => {
      const body = parse(accountBody, await readJson(req));
      const userId = createId(now());
      db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(userId, now());
      return { userId, token: issueToken(userId, body.deviceId, body.platform) };
    },

    'POST /v1/link-code': async (req) => {
      const { userId } = auth(req);
      db.prepare('DELETE FROM link_codes WHERE expires_at < ?').run(now());
      const code = createLinkCode(8);
      const expiresAt = now() + LINK_CODE_TTL;
      db.prepare('INSERT INTO link_codes (code, user_id, expires_at) VALUES (?, ?, ?)').run(code, userId, expiresAt);
      return { code, expiresAt };
    },

    'POST /v1/link': async (req) => {
      const body = parse(linkBody, await readJson(req));
      const code = body.code.toUpperCase();
      const row = db.prepare('SELECT user_id, expires_at FROM link_codes WHERE code = ?').get(code) as { user_id: string; expires_at: number } | undefined;
      if (!row || row.expires_at < now()) throw new HttpError(404, 'That code is invalid or has expired');
      db.prepare('DELETE FROM link_codes WHERE code = ?').run(code); // single use
      return { userId: row.user_id, token: issueToken(row.user_id, body.deviceId, body.platform) };
    },

    'POST /v1/sync': async (req) => {
      const { userId } = auth(req);
      const body = parse(syncBody, await readJson(req));
      if (body.schemaVersion > SCHEMA_VERSION) throw new HttpError(426, 'Client is newer than the server; please update the server');
      const insert = db.prepare('INSERT OR IGNORE INTO events (user_id, id, type, hlc, device_id, payload, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      db.exec('BEGIN');
      try {
        for (const e of body.events) insert.run(userId, e.id, e.type, e.hlc, body.deviceId, JSON.stringify(e.payload), now());
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      const rows = db
        .prepare('SELECT seq, id, type, hlc, device_id, payload FROM events WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?')
        .all(userId, body.cursor, PAGE + 1) as Array<{ seq: number; id: string; type: SyncEvent['type']; hlc: string; device_id: string; payload: string }>;
      const more = rows.length > PAGE;
      const page = rows.slice(0, PAGE);
      const response: SyncResponse = {
        accepted: body.events.map((e) => e.id),
        events: page
          .filter((r) => r.device_id !== body.deviceId)
          .map((r) => ({ type: r.type, id: r.id, hlc: r.hlc, payload: JSON.parse(r.payload) }) as SyncEvent),
        cursor: page.length ? (page[page.length - 1] as { seq: number }).seq : body.cursor,
        more,
        serverTime: now(),
      };
      return response;
    },

    'GET /v1/export': async (req) => {
      const { userId } = auth(req);
      const events = db.prepare('SELECT id, type, hlc, device_id, payload, received_at FROM events WHERE user_id = ? ORDER BY seq').all(userId) as Array<{ payload: string }>;
      return { userId, events: events.map((e) => ({ ...e, payload: JSON.parse(e.payload) })) };
    },

    'DELETE /v1/account': async (req) => {
      const { userId } = auth(req);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId); // cascades to tokens, codes and events
      log(`deleted account ${userId.slice(0, 8)}…`);
      return { deleted: true };
    },
  };

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': opts.corsOrigin ?? '*',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      'cache-control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };

  const server = createServer((req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const path = (req.url ?? '/').split('?')[0];
    const route = routes[`${req.method} ${path}`];
    if (!route) return send(res, 404, { error: 'Not found' });
    route(req)
      .then((body) => send(res, 200, body))
      .catch((err: unknown) => {
        if (err instanceof HttpError) return send(res, err.status, { error: err.message });
        // Never log request bodies: they contain personal learning history.
        log(`internal error on ${req.method} ${path}: ${err instanceof Error ? err.message : 'unknown'}`);
        send(res, 500, { error: 'Internal server error' });
      });
  });

  return {
    server,
    db,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          db.close();
          resolve();
        });
      }),
  };
}
