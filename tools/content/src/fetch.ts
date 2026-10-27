/**
 * Download the pinned datasets into .cache/datasets (gitignored) and record
 * their SHA-256 in .cache/datasets/lock.json. Existing files are kept.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CACHE_DIR, DATASETS } from './sources';

const dir = fileURLToPath(CACHE_DIR);
mkdirSync(dir, { recursive: true });
const lock: Record<string, { url: string; sha256: string; bytes: number }> = {};

for (const d of DATASETS) {
  const path = `${dir}/${d.file}`;
  if (!existsSync(path) || process.argv.includes('--force')) {
    process.stdout.write(`downloading ${d.id} … `);
    const res = await fetch(d.url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`${d.url}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log('done');
  }
  const buf = readFileSync(path);
  lock[d.id] = { url: d.url, sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}
writeFileSync(`${dir}/lock.json`, JSON.stringify(lock, null, 2));
console.log(`datasets ready in ${dir}`);
