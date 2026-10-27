import { useEffect, useState } from 'react';
import type { AppState } from '@jc/app-core';
import { PACK_LEVELS, type ContentLevelStatus, type ContentStatus } from '@jc/japanese-content';
import { SKILLS, type CharacterMood, type JlptBand, type Skill, type UserSettings } from '@jc/shared-types';
import { SKILL_LABELS, relativeTime, t } from '@jc/design-system';
import { COSMETICS, MILESTONES } from '@jc/learning-engine';
import { api, desktop, isElectron } from '../bridge';
import { useLoad } from '../hooks';
import { detectJapaneseVoice } from '../audio';
import { Mocchi } from '../components/Mocchi';
import { ErrorNote, Meter, Stepper, TimeField, Toggle } from '../components/ui';
import { PlacementResults } from './Onboarding';

export function Settings({ state }: { state: AppState }) {
  const s = state.settings;
  const set = (patch: Partial<UserSettings>) => void api.updateSettings(patch);
  const toggleSkill = (k: Skill) => set({ enabledSkills: s.enabledSkills.includes(k) ? s.enabledSkills.filter((x) => x !== k) : [...s.enabledSkills, k] });
  const paused = state.pause.indefinite || state.pause.until !== null;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>{t('nav.settings')}</h1>

      <section className="panel">
        <h2>{t('settings.pause')}</h2>
        {paused ? (
          <div className="row">
            <span className="tag warn">{state.pause.indefinite ? t('settings.pauseForever') : `until ${new Date(state.pause.until ?? 0).toLocaleString()}`}</span>
            <button type="button" className="btn primary" onClick={() => void api.resume()}>
              {t('home.resume')}
            </button>
          </div>
        ) : (
          <div className="row">
            <button type="button" className="btn" onClick={() => void api.pause('1h')}>
              {t('settings.pause1h')}
            </button>
            <button type="button" className="btn" onClick={() => void api.pause('tomorrow')}>
              {t('settings.pauseTomorrow')}
            </button>
            <button type="button" className="btn" onClick={() => void api.pause('indefinite')}>
              {t('settings.pauseForever')}
            </button>
          </div>
        )}
        {state.snoozeUntil ? <p className="dim small">Snoozed until {new Date(state.snoozeUntil).toLocaleTimeString()}.</p> : null}
      </section>

      <section className="panel">
        <h2>{t('settings.learning')}</h2>
        <Stepper label={t('settings.dailyGoal')} value={s.dailyGoalQuestions} min={0} max={200} step={5} onChange={(v) => set({ dailyGoalQuestions: v })} />
        <Stepper label={t('settings.sessionLength')} value={s.sessionLength} min={2} max={5} onChange={(v) => set({ sessionLength: v })} />
        <Stepper label={t('settings.newItems')} value={s.newItemsPerSession} min={0} max={5} onChange={(v) => set({ newItemsPerSession: v })} />
        <div className="field" style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
          <span>{t('settings.skills')}</span>
          <div className="chips">
            {SKILLS.filter((k) => k !== 'listening' || state.listeningAvailable).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={s.enabledSkills.includes(k)} onClick={() => toggleSkill(k)}>
                {SKILL_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        {!state.listeningAvailable ? <VoicePrompt /> : null}
      </section>

      <section className="panel">
        <h2>{t('settings.interruptions')}</h2>
        <p className="faint small" style={{ marginTop: -6 }}>
          {t('settings.interruptionsHint')}
        </p>
        <Toggle label={t('settings.popup')} checked={s.popupEnabled} onChange={(v) => set({ popupEnabled: v })} />
        <Stepper
          label={t('settings.interval')}
          value={s.popupIntervalMinMinutes}
          min={10}
          max={240}
          step={5}
          format={(v) => `${v}–${s.popupIntervalMaxMinutes}`}
          onChange={(v) => set({ popupIntervalMinMinutes: v, popupIntervalMaxMinutes: Math.max(v + 10, s.popupIntervalMaxMinutes + (v - s.popupIntervalMinMinutes)) })}
        />
        <Stepper
          label={t('settings.everyHours')}
          value={s.checkInEveryHours}
          min={0}
          max={12}
          format={(v) => (v === 0 ? t('settings.off') : `${v}`)}
          onChange={(v) => set({ checkInEveryHours: v })}
        />
        <p className="faint small" style={{ margin: 0 }}>
          {t('settings.everyHoursHint')}
        </p>
        <Stepper label={t('settings.maxDaily')} value={s.maxDailyInterruptions} min={1} max={30} onChange={(v) => set({ maxDailyInterruptions: v })} />
        <Stepper label={t('settings.minGap')} value={s.minMinutesBetweenInterruptions} min={5} max={240} step={5} onChange={(v) => set({ minMinutesBetweenInterruptions: v })} />
        <Toggle label={t('settings.focus')} hint={t('settings.focusHint')} checked={s.popupTakesFocus} onChange={(v) => set({ popupTakesFocus: v })} />
        <Toggle label={t('settings.quiet')} checked={s.quietHours.enabled} onChange={(v) => set({ quietHours: { ...s.quietHours, enabled: v } })} />
        {s.quietHours.enabled ? (
          <div className="row" style={{ paddingBottom: 8 }}>
            <TimeField label={t('settings.quietFrom')} minutes={s.quietHours.start} onChange={(m) => set({ quietHours: { ...s.quietHours, start: m } })} />
            <TimeField label={t('settings.quietTo')} minutes={s.quietHours.end} onChange={(m) => set({ quietHours: { ...s.quietHours, end: m } })} />
          </div>
        ) : null}
        <Toggle label={t('settings.desktopNotifications')} checked={s.desktopNotifications} onChange={(v) => set({ desktopNotifications: v })} />
        <Toggle label={t('settings.notifyAlongside')} checked={s.notifyAlongsidePopup} onChange={(v) => set({ notifyAlongsidePopup: v })} />
      </section>

      <section className="panel">
        <h2>{t('settings.appearance')}</h2>
        <div className="field">
          <span>{t('settings.theme')}</span>
          <div className="chips">
            {(['night', 'paper'] as const).map((th) => (
              <button key={th} type="button" className="chip" aria-pressed={s.theme === th} onClick={() => set({ theme: th })}>
                {th === 'night' ? t('settings.themeNight') : t('settings.themePaper')}
              </button>
            ))}
          </div>
        </div>
        {isElectron ? <Toggle label={t('settings.characterVisible')} checked={s.characterVisible} onChange={(v) => set({ characterVisible: v })} /> : null}
        <Toggle label={t('settings.characterAnimation')} checked={s.characterAnimation} onChange={(v) => set({ characterAnimation: v })} />
        <Toggle label={t('settings.reducedMotion')} checked={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
        <Toggle label={t('settings.sound')} checked={s.soundEffects} onChange={(v) => set({ soundEffects: v })} />
        <Toggle label={t('settings.romaji')} checked={s.showRomaji} onChange={(v) => set({ showRomaji: v })} />
        <Toggle label={t('settings.translations')} checked={s.showTranslations} onChange={(v) => set({ showTranslations: v })} />
      </section>

      {isElectron ? <ContentPanel /> : null}

      <section className="panel">
        <h2>{t('settings.system')}</h2>
        {isElectron ? <Toggle label={t('settings.startup')} checked={s.launchAtStartup} onChange={(v) => set({ launchAtStartup: v })} /> : null}
        <RetakePlacement state={state} />
      </section>

      <SyncPanel state={state} />
    </div>
  );
}

/** Shown while no Japanese text-to-speech voice is available: how to install one. */
function VoicePrompt() {
  const { data: info } = useLoad(() => desktop.info(), [], false);
  const [checking, setChecking] = useState(false);
  const [stillMissing, setStillMissing] = useState(false);
  const platform = info?.platform;
  const check = async () => {
    setChecking(true);
    const ok = await detectJapaneseVoice();
    await desktop.setListening(ok);
    setStillMissing(!ok);
    setChecking(false);
  };
  return (
    <div className="panel alt stack" role="note" style={{ gap: 8, marginTop: 8 }}>
      <strong>{t('settings.voiceTitle')}</strong>
      <span className="small">{t('settings.voiceBody')}</span>
      <span className="small dim">
        {platform === 'win32' ? t('settings.voiceStepsWin') : platform === 'darwin' ? t('settings.voiceStepsMac') : t('settings.voiceStepsOther')}
      </span>
      <div className="row">
        {platform === 'win32' && isElectron ? (
          <button type="button" className="btn primary small" onClick={() => void desktop.openVoiceSettings()}>
            {t('settings.voiceOpen')}
          </button>
        ) : null}
        <button type="button" className="btn small" disabled={checking} onClick={() => void check()}>
          {t('settings.voiceCheck')}
        </button>
        {isElectron ? (
          <button type="button" className="btn ghost small" onClick={() => void desktop.relaunch()}>
            {t('settings.voiceRestart')}
          </button>
        ) : null}
      </div>
      {stillMissing ? <span className="faint small">{t('settings.voiceStillMissing')}</span> : null}
    </div>
  );
}

function ContentPanel() {
  const { data, reload } = useLoad(() => desktop.contentStatus(), []);
  const [live, setLive] = useState<ContentStatus | null>(null);
  useEffect(() => desktop.onContent((s) => setLive(s)), []);
  const status = live ?? data;
  if (!status?.available) return null;
  const change = async (level: JlptBand) => {
    if (PACK_LEVELS.indexOf(level) < PACK_LEVELS.indexOf(status.targetLevel) && !confirm(t('settings.contentLower'))) return;
    setLive(await desktop.setContentLevel(level));
    reload();
  };
  const stateLabel = (l: ContentLevelStatus) =>
    l.state === 'installed' ? t('settings.contentInstalled') : l.state === 'downloading' ? t('settings.contentDownloading') : l.state === 'failed' ? t('settings.contentFailed') : t('settings.contentMissing');
  const failed = status.levels.find((l) => l.included && l.state === 'failed');
  return (
    <section className="panel">
      <h2>{t('settings.content')}</h2>
      <p className="faint small" style={{ marginTop: -6 }}>
        {t('settings.contentHint')}
      </p>
      <div className="field">
        <span>{t('settings.contentLevel')}</span>
        <div className="chips" role="radiogroup" aria-label={t('settings.contentLevel')}>
          {PACK_LEVELS.map((l) => (
            <button key={l} type="button" role="radio" className="chip" aria-checked={status.targetLevel === l} aria-pressed={status.targetLevel === l} disabled={status.busy} onClick={() => void change(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', gap: 6 }}>
        {status.levels
          .filter((l) => l.included)
          .map((l) => (
            <li key={l.level} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <strong>{l.level}</strong>{' '}
                <span className="faint small">
                  {t('settings.contentCounts', { vocab: l.counts.vocab.toLocaleString(), kanji: l.counts.kanji.toLocaleString(), grammar: l.counts.grammar })} ·{' '}
                  {l.level === 'N5' ? t('settings.contentBuiltIn') : l.bytes < 1024 * 1024 ? `${Math.max(1, Math.round(l.bytes / 1024))} KB` : `${(l.bytes / 1024 / 1024).toFixed(1)} MB`}
                </span>
              </span>
              <span className={`tag${l.state === 'installed' ? ' good' : l.state === 'failed' ? ' bad' : ''}`} title={l.error}>
                {stateLabel(l)}
              </span>
            </li>
          ))}
      </ul>
      {failed ? (
        <div className="row" style={{ marginTop: 8 }}>
          <span className="faint small">{failed.error}</span>
          <button type="button" className="btn small" disabled={status.busy} onClick={() => void desktop.retryContent().then(setLive)}>
            {t('settings.contentRetry')}
          </button>
        </div>
      ) : null}
      <p className="faint small">{t('settings.contentUnofficial')}</p>
    </section>
  );
}

function RetakePlacement({ state }: { state: AppState }) {
  const [showLast, setShowLast] = useState(false);
  // The retake runs in the corner pop-up, like the first exam.
  const start = async () => {
    if (!state.placementInProgress) await api.beginPlacement(state.profile?.experience ?? 'beginner');
    await desktop.openPlacement();
  };
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="field">
        <span>
          {t('settings.placement')}
          {state.placementInProgress ? (
            <span className="faint small" style={{ display: 'block' }}>{t('onboard.exam.corner')}</span>
          ) : state.placement ? (
            <span className="faint small" style={{ display: 'block' }}>Last taken {relativeTime(state.placement.takenAt, Date.now())}</span>
          ) : null}
        </span>
        <span className="row">
          {state.placement ? (
            <button type="button" className="btn ghost small" aria-expanded={showLast} onClick={() => setShowLast((v) => !v)}>
              Last result
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => void start()}>
            {state.placementInProgress ? t('onboard.exam.reopen') : t('common.start')}
          </button>
        </span>
      </div>
      {showLast && state.placement ? (
        <div className="panel alt">
          <PlacementResults result={state.placement} />
        </div>
      ) : null}
    </div>
  );
}

function SyncPanel({ state }: { state: AppState }) {
  const { data: status, reload } = useLoad(() => api.getSyncStatus(), []);
  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [entered, setEntered] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      reload();
    }
  };
  return (
    <section className="panel">
      <h2>{t('settings.sync')}</h2>
      <div className="field">
        <label htmlFor="sync-url">{t('settings.syncServer')}</label>
        <input id="sync-url" className="input" style={{ maxWidth: 320 }} defaultValue={state.settings.syncServerUrl} onBlur={(e) => void api.updateSettings({ syncServerUrl: e.target.value.trim() })} />
      </div>
      {status?.linked ? (
        <div className="stack" style={{ marginTop: 8 }}>
          <div className="small">
            {status.lastSyncAt ? t('settings.syncLast', { when: relativeTime(status.lastSyncAt, Date.now()) }) : t('settings.syncNever')}
            {status.pending ? ` · ${t('settings.syncPending', { n: status.pending })}` : ''}
          </div>
          {status.lastError ? <div className="tag bad">{status.lastError}</div> : null}
          <div className="row">
            <button type="button" className="btn primary" disabled={busy} onClick={() => void run(() => api.syncNow())}>
              {t('settings.syncNow')}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => void run(async () => setCode(await api.getLinkCode()))}>
              {t('settings.syncLinkCode')}
            </button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => void run(() => api.unlinkAccount())}>
              {t('settings.syncUnlink')}
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={busy}
              onClick={() => {
                if (confirm('Delete your sync account and all data stored on the server? Local data on this device is kept.')) void run(() => api.deleteAccount());
              }}
            >
              {t('settings.syncDelete')}
            </button>
          </div>
          {code ? (
            <div className="panel alt">
              <div className="display" style={{ fontSize: 28, letterSpacing: 4 }}>
                {code.code}
              </div>
              <div className="faint small">Enter this on your other device. Expires {relativeTime(code.expiresAt, Date.now())}.</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 8 }}>
          <p className="dim small" style={{ margin: 0 }}>
            {t('settings.syncOff')}
          </p>
          <div className="row">
            <button type="button" className="btn primary" disabled={busy} onClick={() => void run(() => api.createAccount())}>
              {t('settings.syncCreate')}
            </button>
          </div>
          <div className="row">
            <input className="input" style={{ maxWidth: 200, textTransform: 'uppercase' }} placeholder="ABCD2345" aria-label={t('settings.syncEnterCode')} value={entered} onChange={(e) => setEntered(e.target.value)} />
            <button type="button" className="btn" disabled={busy || entered.trim().length < 6} onClick={() => void run(() => api.linkWithCode(entered))}>
              {t('settings.syncLink')}
            </button>
          </div>
        </div>
      )}
      <ErrorNote message={error} />
    </section>
  );
}

export function CharacterScreen({ state }: { state: AppState }) {
  const [preview, setPreview] = useState<CharacterMood>('happy');
  const c = state.character;
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  const moods: CharacterMood[] = ['idle', 'happy', 'thinking', 'curious', 'confused', 'sleepy', 'celebrating', 'encouraging', 'studying', 'waiting', 'sad'];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>{t('character.title')}</h1>
      <section className="panel hero">
        <Mocchi mood={preview} cosmetic={c.selectedCosmetic} scale={6} animate={animate} />
        <div className="stack">
          <div className="display" style={{ fontSize: 22 }}>
            {t('character.level', { level: state.level.level })}
          </div>
          <Meter value={state.level.into} max={state.level.needed} label="XP" />
          <div className="faint small">{t('character.xpToNext', { n: state.level.needed - state.level.into })}</div>
          <div className="chips">
            {moods.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={preview === m} onClick={() => setPreview(m)}>
                {m}
              </button>
            ))}
          </div>
          <p className="faint small" style={{ margin: 0 }}>
            {t('character.note')}
          </p>
        </div>
      </section>
      <section className="panel">
        <h2>{t('character.cosmetics')}</h2>
        <div className="cosmetics">
          <button type="button" className="cosmetic" aria-pressed={c.selectedCosmetic === null} onClick={() => void api.selectCosmetic(null)}>
            <Mocchi mood="idle" scale={2} animate={false} />
            <span className="small">{t('character.none')}</span>
          </button>
          {COSMETICS.map((cos) => {
            const unlocked = c.unlocked.includes(cos.id);
            return (
              <button
                key={cos.id}
                type="button"
                className="cosmetic"
                aria-pressed={c.selectedCosmetic === cos.id}
                disabled={!unlocked}
                title={cos.description}
                onClick={() => void api.selectCosmetic(cos.id)}
              >
                <Mocchi mood="idle" cosmetic={cos.id} scale={2} animate={false} label={cos.name} />
                <span className="small">{cos.name}</span>
                {!unlocked ? <span className="faint small">{cos.description}</span> : null}
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h2>{t('character.milestones')}</h2>
        <div className="chips">
          {MILESTONES.map((m) => (
            <span key={m.id} className={`tag ${c.milestones.includes(m.id) ? 'good' : ''}`}>
              {c.milestones.includes(m.id) ? '★' : '☆'} {m.title}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

export function About() {
  const { data: info } = useLoad(() => desktop.info(), [], false);
  const [confirmText, setConfirmText] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>{t('nav.about')}</h1>
      <section className="panel">
        <h2>{t('about.privacy')}</h2>
        <p>{t('about.privacyBody')}</p>
      </section>
      <section className="panel">
        <h2>{t('about.content')}</h2>
        <p>{t('about.contentBody')}</p>
        <p className="dim small">{t('about.contentSources')}</p>
        <p className="faint small">Pixel font: DotGothic16 (SIL Open Font License). {info ? t('about.version', { version: info.version }) : ''}</p>
      </section>
      <section className="panel stack">
        <h2>Data</h2>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const path = await desktop.saveExport(await api.exportData());
              setSaved(path);
            }}
          >
            {t('about.export')}
          </button>
          {saved ? <span className="dim small">Saved {saved}</span> : null}
        </div>
        <p className="dim small" style={{ margin: 0 }}>
          {t('about.clearConfirm')}
        </p>
        <div className="row">
          <input className="input" style={{ maxWidth: 160 }} aria-label="Type DELETE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <button type="button" className="btn danger" disabled={confirmText !== 'DELETE'} onClick={() => void api.clearAllData()}>
            {t('about.clear')}
          </button>
        </div>
      </section>
    </div>
  );
}
