/**
 * JLPT level packs on desktop. Pure Node (no Electron imports) so it can be tested.
 *
 * Where packs live:
 * - <resources>/content: manifest.json, the N5 pack shipped in the installer, packs
 *   the installer downloaded, and selection.json (the level picked in the installer).
 * - <userData>/content: packs downloaded later by the app, plus state.json.
 *
 * A pack is used only if its SHA-256 matches the bundled manifest, so a truncated
 * or tampered download is ignored and fetched again.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { JlptBand } from '@jc/shared-types';
import {
  PACK_LEVELS,
  levelsUpTo,
  parseLevelPack,
  type ContentManifest,
  type ContentStatus,
  type LevelPack,
  type PackInfo,
  type PackState,
} from '@jc/japanese-content';

interface SavedState {
  targetLevel?: JlptBand;
  /** The installer selection last adopted, so a re-install with a new choice wins. */
  installerSelection?: JlptBand;
}

export interface ContentManagerOptions {
  resourcesDir: string;
  userDir: string;
  /** Overrides the manifest's download base URL (testing / self-hosting). */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Items per level already in the app bundle, added to the pack counts in status(). */
  bundledCounts?: Partial<Record<JlptBand, PackInfo['counts']>>;
  onChange?: (status: ContentStatus) => void;
  /** Called after the set of loaded packs changes. */
  onPacks?: (packs: LevelPack[]) => void;
}

const isLevel = (v: unknown): v is JlptBand => typeof v === 'string' && (PACK_LEVELS as readonly string[]).includes(v);

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

export class ContentManager {
  readonly manifest: ContentManifest | null;
  private state: SavedState;
  private loaded = new Map<JlptBand, LevelPack>();
  private progress = new Map<JlptBand, { state: PackState; error?: string }>();
  private busy = false;

  constructor(private readonly opts: ContentManagerOptions) {
    this.manifest = readJson<ContentManifest>(join(opts.resourcesDir, 'manifest.json'));
    mkdirSync(opts.userDir, { recursive: true });
    this.state = readJson<SavedState>(this.statePath) ?? {};
    const installer = readJson<{ targetLevel?: unknown }>(join(opts.resourcesDir, 'selection.json'))?.targetLevel;
    if (isLevel(installer) && installer !== this.state.installerSelection) {
      this.state = { targetLevel: installer, installerSelection: installer };
      this.save();
    }
  }

  private get statePath(): string {
    return join(this.opts.userDir, 'state.json');
  }

  private save(): void {
    writeFileSync(this.statePath, JSON.stringify(this.state));
  }

  get targetLevel(): JlptBand {
    return isLevel(this.state.targetLevel) ? this.state.targetLevel : 'N5';
  }

  private info(level: JlptBand): PackInfo | undefined {
    return this.manifest?.packs.find((p) => p.level === level);
  }

  /** Load every verified pack up to the target level. Returns the loaded packs in level order. */
  load(): LevelPack[] {
    this.loaded.clear();
    for (const level of levelsUpTo(this.targetLevel)) {
      const pack = this.readVerified(level);
      if (pack) this.loaded.set(level, pack);
    }
    return this.packs();
  }

  packs(): LevelPack[] {
    return PACK_LEVELS.map((l) => this.loaded.get(l)).filter((p): p is LevelPack => !!p);
  }

  private readVerified(level: JlptBand): LevelPack | null {
    const info = this.info(level);
    if (!info) return null;
    for (const dir of [this.opts.resourcesDir, this.opts.userDir]) {
      const path = join(dir, info.file);
      if (!existsSync(path)) continue;
      try {
        const buf = readFileSync(path);
        if (createHash('sha256').update(buf).digest('hex') !== info.sha256) continue;
        const { pack } = parseLevelPack(JSON.parse(gunzipSync(buf).toString('utf8')), { validate: false });
        if (pack && pack.level === level) return pack;
      } catch {
        // Unreadable file: treated as missing and downloaded again.
      }
    }
    return null;
  }

  status(): ContentStatus {
    const included = new Set(levelsUpTo(this.targetLevel));
    return {
      available: !!this.manifest,
      targetLevel: this.targetLevel,
      contentVersion: this.manifest?.contentVersion ?? '',
      busy: this.busy,
      levels: (this.manifest?.packs ?? []).map((p) => {
        const live = this.progress.get(p.level);
        const state: PackState = this.loaded.has(p.level) ? 'installed' : (live?.state ?? 'missing');
        // Counts include the bundled curriculum's items at that level, so they match what the learner gets.
        const extra = this.opts.bundledCounts?.[p.level];
        const counts = extra
          ? { vocab: p.counts.vocab + extra.vocab, kanji: p.counts.kanji + extra.kanji, grammar: p.counts.grammar + extra.grammar, readings: p.counts.readings + extra.readings }
          : p.counts;
        return { level: p.level, state, bytes: p.bytes, counts, included: included.has(p.level), error: state === 'failed' ? live?.error : undefined };
      }),
    };
  }

  private changed(): void {
    this.opts.onChange?.(this.status());
  }

  /** Change the target level; downloads anything missing. Lowering it unloads higher levels (files are kept). */
  async setTargetLevel(level: JlptBand): Promise<ContentStatus> {
    if (!isLevel(level)) throw new Error('Unknown level');
    this.state = { ...this.state, targetLevel: level };
    this.save();
    this.load();
    this.opts.onPacks?.(this.packs());
    this.changed();
    await this.downloadMissing();
    return this.status();
  }

  /** Download packs that the target level needs but that are missing or failed verification. */
  async downloadMissing(): Promise<ContentStatus> {
    if (this.busy || !this.manifest) return this.status();
    const missing = levelsUpTo(this.targetLevel).filter((l) => !this.loaded.has(l) && this.info(l));
    if (!missing.length) return this.status();
    this.busy = true;
    let added = false;
    try {
      for (const level of missing) {
        this.progress.set(level, { state: 'downloading' });
        this.changed();
        try {
          await this.download(level);
          const pack = this.readVerified(level);
          if (!pack) throw new Error('The downloaded file did not pass verification.');
          this.loaded.set(level, pack);
          this.progress.delete(level);
          added = true;
        } catch (err) {
          this.progress.set(level, { state: 'failed', error: err instanceof Error ? err.message : String(err) });
        }
        this.changed();
      }
    } finally {
      this.busy = false;
    }
    if (added) this.opts.onPacks?.(this.packs());
    this.changed();
    return this.status();
  }

  private async download(level: JlptBand): Promise<void> {
    const info = this.info(level) as PackInfo;
    const base = this.opts.baseUrl ?? this.manifest?.baseUrl ?? '';
    const url = new URL(info.file, base.endsWith('/') ? base : `${base}/`).toString();
    if (!/^https:|^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error('Content downloads must use HTTPS.');
    const res = await (this.opts.fetch ?? fetch)(url, { redirect: 'follow', signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (createHash('sha256').update(buf).digest('hex') !== info.sha256) throw new Error('The downloaded file did not match its checksum.');
    const final = join(this.opts.userDir, info.file);
    const tmp = `${final}.part`;
    writeFileSync(tmp, buf);
    rmSync(final, { force: true });
    renameSync(tmp, final);
  }
}
