import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApi } from './app';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';
const dbPath = resolve(process.env.DB_PATH ?? './data/sync.db');
mkdirSync(dirname(dbPath), { recursive: true });

const { server, close } = createApi({
  dbPath,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  log: (msg) => console.log(`[api] ${msg}`),
});

server.listen(port, host, () => {
  console.log(`[api] sync service listening on http://${host}:${port} (db: ${dbPath})`);
  if (host !== '127.0.0.1' && host !== 'localhost') {
    console.log('[api] Serve this behind HTTPS (e.g. a reverse proxy) before exposing it beyond your machine.');
  }
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void close().then(() => process.exit(0));
  });
}
