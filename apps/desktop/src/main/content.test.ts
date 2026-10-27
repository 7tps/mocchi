import { afterAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { JlptBand, LearningItem } from '@jc/shared-types';
import type { ContentManifest, LevelPack } from '@jc/japanese-content';
import { ContentManager } from './content';

const root = mkdtempSync(join(tmpdir(), 'jc-content-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
let n = 0;

function word(level: JlptBand, i: number): LearningItem {
  return {
    id: `v:test-${level}-${i}`, type: 'vocab', ja: `テスト${level}${i}`, reading: 'てすと', meanings: [`test ${level} ${i}`], examples: [],
    difficulty: 3, jlpt: level, skills: ['vocabulary'], tags: [], order: i, importance: 0.5, source: { id: 't', license: 'MIT' },
  };
}

function gz(level: JlptBand): Buffer {
  const pack: LevelPack = { format: 'jc-content-pack', version: 1, name: level, level, contentVersion: 't', source: { id: 't', license: 'MIT' }, items: [word(level, 1), word(level, 2)] };
  return gzipSync(Buffer.from(JSON.stringify(pack)));
}

/** A resources dir with a manifest for all levels and the given packs present. */
function setup(present: JlptBand[], selection?: JlptBand) {
  const dir = join(root, `case${n++}`);
  const resourcesDir = join(dir, 'resources');
  const userDir = join(dir, 'user');
  mkdirSync(resourcesDir, { recursive: true });
  const files = new Map<string, Buffer>();
  const manifest: ContentManifest = { format: 'jc-content-manifest', contentVersion: 't', baseUrl: 'https://example.test/packs/', packs: [] };
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1'] as JlptBand[]) {
    const buf = gz(level);
    const file = `jlpt-${level.toLowerCase()}.json.gz`;
    files.set(file, buf);
    manifest.packs.push({ level, file, sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length, counts: { vocab: 2, kanji: 0, grammar: 0, readings: 0 } });
    if (present.includes(level)) writeFileSync(join(resourcesDir, file), buf);
  }
  writeFileSync(join(resourcesDir, 'manifest.json'), JSON.stringify(manifest));
  if (selection) writeFileSync(join(resourcesDir, 'selection.json'), JSON.stringify({ targetLevel: selection }));
  const requested: string[] = [];
  const fakeFetch = (async (url: string | URL) => {
    requested.push(String(url));
    const body = files.get(String(url).split('/').pop() ?? '');
    return body ? new Response(new Uint8Array(body)) : new Response('missing', { status: 404 });
  }) as typeof fetch;
  return { resourcesDir, userDir, files, requested, fakeFetch };
}

describe('content packs on desktop', () => {
  it('defaults to N5 and loads only verified packs up to the target', () => {
    const s = setup(['N5', 'N4']);
    const cm = new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir });
    expect(cm.targetLevel).toBe('N5');
    expect(cm.load().map((p) => p.level)).toEqual(['N5']);
  });

  it('adopts the level chosen in the installer, once', () => {
    const s = setup(['N5', 'N4', 'N3'], 'N3');
    const cm = new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir });
    expect(cm.targetLevel).toBe('N3');
    expect(cm.load().map((p) => p.level)).toEqual(['N5', 'N4', 'N3']);
    // Later changes in the app win over the same installer selection…
    writeFileSync(join(s.userDir, 'state.json'), JSON.stringify({ targetLevel: 'N4', installerSelection: 'N3' }));
    expect(new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir }).targetLevel).toBe('N4');
    // …until the installer is run again with a different choice.
    writeFileSync(join(s.resourcesDir, 'selection.json'), JSON.stringify({ targetLevel: 'N2' }));
    expect(new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir }).targetLevel).toBe('N2');
  });

  it('ignores a pack whose checksum does not match and downloads it again', async () => {
    const s = setup(['N5', 'N4'], 'N4');
    const path = join(s.resourcesDir, 'jlpt-n4.json.gz');
    writeFileSync(path, readFileSync(path).subarray(0, 40));
    const cm = new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir, fetch: s.fakeFetch });
    expect(cm.load().map((p) => p.level)).toEqual(['N5']);
    const status = await cm.downloadMissing();
    expect(s.requested).toEqual(['https://example.test/packs/jlpt-n4.json.gz']);
    expect(status.levels.filter((l) => l.included).map((l) => l.state)).toEqual(['installed', 'installed']);
    expect(cm.packs().map((p) => p.level)).toEqual(['N5', 'N4']);
  });

  it('downloads every missing level when the target is raised, and reports new packs', async () => {
    const s = setup(['N5']);
    const seen: string[][] = [];
    const cm = new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir, fetch: s.fakeFetch, onPacks: (p) => seen.push(p.map((x) => x.level)) });
    cm.load();
    const status = await cm.setTargetLevel('N2');
    expect(s.requested.map((u) => u.split('/').pop())).toEqual(['jlpt-n4.json.gz', 'jlpt-n3.json.gz', 'jlpt-n2.json.gz']);
    expect(status.targetLevel).toBe('N2');
    expect(seen.at(-1)).toEqual(['N5', 'N4', 'N3', 'N2']);
    // Lowering unloads higher levels without deleting them.
    await cm.setTargetLevel('N4');
    expect(cm.packs().map((p) => p.level)).toEqual(['N5', 'N4']);
    await cm.setTargetLevel('N2');
    expect(s.requested).toHaveLength(3);
  });

  it('rejects corrupted downloads and insecure URLs', async () => {
    const s = setup(['N5']);
    const bad = (async () => new Response(new Uint8Array([1, 2, 3]))) as unknown as typeof fetch;
    const cm = new ContentManager({ resourcesDir: s.resourcesDir, userDir: s.userDir, fetch: bad });
    cm.load();
    const status = await cm.setTargetLevel('N4');
    const n4 = status.levels.find((l) => l.level === 'N4');
    expect(n4?.state).toBe('failed');
    expect(n4?.error).toMatch(/checksum/);

    const insecure = new ContentManager({ resourcesDir: s.resourcesDir, userDir: join(s.userDir, 'x'), baseUrl: 'http://example.test/', fetch: s.fakeFetch });
    insecure.load();
    const st = await insecure.setTargetLevel('N4');
    expect(st.levels.find((l) => l.level === 'N4')?.error).toMatch(/HTTPS/);
    expect(s.requested).toEqual([]);
  });
});
