import { useEffect, useRef, useState } from 'react';
import type { AppState, Feedback, PlacementView } from '@jc/app-core';
import type { AnswerMeta, CharacterMood, ExperienceLevel, PlacementResult, UserSettings } from '@jc/shared-types';
import { SKILL_LABELS, t, type StringKey } from '@jc/design-system';
import { api, desktop } from '../bridge';
import { Mocchi } from '../components/Mocchi';
import { QuestionCard } from '../components/QuestionCard';
import { Meter, Stepper, TimeField, Toggle } from '../components/ui';

const EXPERIENCES: ExperienceLevel[] = ['none', 'kana', 'beginner', 'intermediate', 'advanced'];

/** Adaptive placement exam. On desktop it runs in the corner pop-up; the browser preview uses it in-page. */
export function PlacementFlow({ state, onDone, onMood }: { state: AppState; onDone: (r: PlacementResult) => void; onMood: (m: CharacterMood) => void }) {
  const [view, setView] = useState<PlacementView | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const resumed = await api.resumePlacement();
      setView(resumed ?? (await api.beginPlacement(state.profile?.experience ?? 'none')));
      onMood('thinking');
    })();
    // Start (or resume) once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = async (response: string | string[] | null, latency?: number, meta: AnswerMeta = {}) => {
    setBusy(true);
    try {
      const fb = await api.answerPlacement(response, latency, meta);
      setFeedback(fb);
      onMood(fb.mood);
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const v = await api.nextPlacement();
      if (v.finished || !v.question) {
        onDone(await api.finishPlacement());
        return;
      }
      setView(v);
      onMood('thinking');
    } finally {
      setBusy(false);
    }
  };

  if (!view?.question) return <div className="dim">{t('common.loading')}</div>;
  return (
    <div className="stack">
      <div className="row spread small dim">
        <span>{t('onboard.exam.progress', { n: view.answered + 1, total: view.estimatedTotal })}</span>
        <span className="tag">{SKILL_LABELS[view.question.placementSkill]}</span>
      </div>
      <Meter value={view.answered} max={view.estimatedTotal} label="Exam progress" />
      <QuestionCard
        question={view.question}
        feedback={feedback}
        busy={busy}
        onSubmit={(r, l, meta) => void answer(r, l, meta)}
        onContinue={() => void next()}
        continueLabel={t('quiz.next')}
        showRomaji={false}
        showTranslations
        autoFocus
        onCantReadKanji={() => void answer(null, undefined, { cantReadKanji: true })}
        extra={
          <button type="button" className="btn ghost small" onClick={() => void answer(null)} disabled={busy}>
            {t('onboard.exam.dontKnow')}
          </button>
        }
      />
    </div>
  );
}

export function PlacementResults({ result }: { result: PlacementResult }) {
  const known = result.knownKana.filter((k) => /[ぁ-ゖ]/.test(k));
  const knownKata = result.knownKana.filter((k) => /[ァ-ヶ]/.test(k));
  const band = result.band === 'pre-N5' ? 'Pre-N5 (starting out)' : `${result.bandConfident ? '' : '≈ '}${result.band}`;
  return (
    <div className="stack">
      <div className="row spread">
        <div>
          <div className="dim small">{t('onboard.results.band')}</div>
          <div className="display" style={{ fontSize: 32 }}>
            {band}
          </div>
        </div>
        <div style={{ minWidth: 160 }}>
          <div className="dim small">Overall {result.overallScore}/100</div>
          <Meter value={result.overallScore} max={100} label="Overall" />
        </div>
      </div>
      <p className="faint small" style={{ margin: 0 }}>
        {t('onboard.results.approx')}
      </p>
      <div className="grid two">
        {result.categories.map((c) => (
          <div key={c.skill}>
            <div className="row spread small">
              <span>{SKILL_LABELS[c.skill]}</span>
              <span className="dim">
                {c.correct}/{c.asked} · {c.score}
              </span>
            </div>
            <Meter value={c.score} max={100} variant="teal" label={SKILL_LABELS[c.skill]} />
            {c.kanjiBlocked ? <span className="faint small">{t('onboard.results.kanjiBlocked')}</span> : null}
          </div>
        ))}
      </div>
      {result.strengths.length ? (
        <div>
          <span className="dim small">{t('onboard.results.strengths')}: </span>
          {result.strengths.map((s) => (
            <span key={s} className="tag good" style={{ marginRight: 4 }}>
              {SKILL_LABELS[s]}
            </span>
          ))}
        </div>
      ) : null}
      {result.weaknesses.length ? (
        <div>
          <span className="dim small">{t('onboard.results.weaknesses')}: </span>
          {result.weaknesses.map((s) => (
            <span key={s} className="tag warn" style={{ marginRight: 4 }}>
              {SKILL_LABELS[s]}
            </span>
          ))}
        </div>
      ) : null}
      <div className="small">
        <span className="dim">{t('onboard.results.kana')}: </span>
        {known.length} hiragana and {knownKata.length} katakana look familiar.
        {result.unknownKana.length ? (
          <span className="jp" lang="ja">
            {' '}
            To learn: {result.unknownKana.slice(0, 12).join(' ')}
            {result.unknownKana.length > 12 ? ' …' : ''}
          </span>
        ) : null}
      </div>
      <p className="small">
        Recommended starting difficulty: <strong>{result.recommendedDifficulty.toFixed(1)}</strong> / 10. {t('onboard.results.adapt')}
      </p>
    </div>
  );
}

/** Notification, frequency and quiet-hour preferences (skippable). */
export function PreferencesForm({ value, onChange }: { value: Partial<UserSettings> & UserSettings; onChange: (patch: Partial<UserSettings>) => void }) {
  return (
    <div className="stack">
      <Stepper label={t('settings.dailyGoal')} value={value.dailyGoalQuestions} min={5} max={100} step={5} onChange={(v) => onChange({ dailyGoalQuestions: v })} />
      <Stepper label={t('settings.sessionLength')} value={value.sessionLength} min={2} max={5} onChange={(v) => onChange({ sessionLength: v })} />
      <Stepper
        label={t('settings.interval')}
        value={value.popupIntervalMinMinutes}
        min={10}
        max={240}
        step={5}
        format={(v) => `${v}–${Math.max(v, value.popupIntervalMaxMinutes)}`}
        onChange={(v) => onChange({ popupIntervalMinMinutes: v, popupIntervalMaxMinutes: Math.max(v + 15, value.popupIntervalMaxMinutes - value.popupIntervalMinMinutes + v) })}
      />
      <Toggle label={t('settings.quiet')} checked={value.quietHours.enabled} onChange={(v) => onChange({ quietHours: { ...value.quietHours, enabled: v } })} />
      {value.quietHours.enabled ? (
        <div className="row">
          <TimeField label={t('settings.quietFrom')} minutes={value.quietHours.start} onChange={(m) => onChange({ quietHours: { ...value.quietHours, start: m } })} />
          <TimeField label={t('settings.quietTo')} minutes={value.quietHours.end} onChange={(m) => onChange({ quietHours: { ...value.quietHours, end: m } })} />
        </div>
      ) : null}
      <Toggle label={t('settings.focus')} hint={t('settings.focusHint')} checked={value.popupTakesFocus} onChange={(v) => onChange({ popupTakesFocus: v })} />
      <Toggle label={t('settings.startup')} checked={value.launchAtStartup} onChange={(v) => onChange({ launchAtStartup: v })} />
    </div>
  );
}

type Step = 'welcome' | 'how' | 'experience' | 'exam' | 'results' | 'prefs' | 'notify' | 'done';

export function Onboarding({ state }: { state: AppState }) {
  const [step, setStep] = useState<Step>(state.placement ? 'results' : state.placementInProgress ? 'exam' : 'welcome');
  const [experience, setExperience] = useState<ExperienceLevel>(state.profile?.experience ?? 'none');
  const [result, setResult] = useState<PlacementResult | null>(state.placement);
  const [prefs, setPrefs] = useState<UserSettings>(state.settings);
  const [mood, setMood] = useState<CharacterMood>('happy');
  const [examMode, setExamMode] = useState<'choose' | 'exam'>(state.placementInProgress ? 'exam' : 'choose');

  // The exam finishes in the corner pop-up; show the results here when it does.
  const placementId = state.placement?.id;
  useEffect(() => {
    if (placementId && state.placement && (step === 'exam' || step === 'experience')) {
      setResult(state.placement);
      setMood('celebrating');
      setStep('results');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementId]);

  const openExam = async () => {
    if (!state.placementInProgress) await api.beginPlacement(experience);
    setExamMode('exam');
    await desktop.openPlacement();
  };

  const finish = async () => {
    await api.completeOnboarding({ experience, settings: prefs });
  };

  const body = (() => {
    switch (step) {
      case 'welcome':
        return (
          <div className="stack">
            <h1>{t('onboard.welcome.title')}</h1>
            <p>{t('onboard.welcome.body')}</p>
            <div className="row">
              <button type="button" className="btn primary" autoFocus onClick={() => setStep('how')}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        );
      case 'how':
        return (
          <div className="stack">
            <h2>{t('onboard.how.title')}</h2>
            <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
              <li>{t('onboard.how.1')}</li>
              <li>{t('onboard.how.2')}</li>
              <li>{t('onboard.how.3')}</li>
            </ol>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setStep('welcome')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn primary" onClick={() => setStep('experience')}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        );
      case 'experience':
        return (
          <div className="stack">
            <h2>{t('onboard.experience.title')}</h2>
            <div className="grid two" role="radiogroup" aria-label={t('onboard.experience.title')}>
              {EXPERIENCES.map((e) => (
                <button key={e} type="button" className="option" role="radio" aria-checked={experience === e} aria-pressed={experience === e} onClick={() => setExperience(e)}>
                  <span className="display">{t(`onboard.experience.${e}` as StringKey)}</span>
                  <span className="dim small">{t(`onboard.experience.${e}.sub` as StringKey)}</span>
                </button>
              ))}
            </div>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setStep('how')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn primary" onClick={() => setStep('exam')}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        );
      case 'exam':
        if (examMode === 'exam') {
          return (
            <div className="stack">
              <h2>{t('onboard.exam.title')}</h2>
              <p>{t('onboard.exam.corner')}</p>
              <div className="row">
                <button type="button" className="btn primary" onClick={() => void openExam()}>
                  {t('onboard.exam.reopen')}
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="stack">
            <h2>{t('onboard.exam.title')}</h2>
            <p>{t('onboard.exam.body')}</p>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => void openExam()}>
                {t('onboard.exam.start')}
              </button>
            </div>
            <hr style={{ border: 0, borderTop: '1px dashed var(--border)', width: '100%' }} />
            <p className="dim small" style={{ margin: 0 }}>
              {t('onboard.exam.beginnerNote')}
            </p>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  setResult(await api.startAsBeginner());
                  setStep('results');
                }}
              >
                {t('onboard.exam.beginner')}
              </button>
            </div>
          </div>
        );
      case 'results':
        return (
          <div className="stack">
            <h2>{t('onboard.results.title')}</h2>
            {result ? <PlacementResults result={result} /> : null}
            <div className="row">
              <button type="button" className="btn primary" onClick={() => setStep('prefs')}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        );
      case 'prefs':
        return (
          <div className="stack">
            <h2>{t('onboard.prefs.title')}</h2>
            <PreferencesForm value={prefs} onChange={(p) => setPrefs((s) => ({ ...s, ...p }))} />
            <div className="row">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setPrefs(state.settings);
                  setStep('notify');
                }}
              >
                {t('onboard.prefs.skip')}
              </button>
              <button type="button" className="btn primary" onClick={() => setStep('notify')}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        );
      case 'notify':
        return (
          <div className="stack">
            <h2>{t('onboard.notify.title')}</h2>
            <p>{t('onboard.notify.body')}</p>
            <Toggle label={t('settings.popup')} checked={prefs.popupEnabled} onChange={(v) => setPrefs((s) => ({ ...s, popupEnabled: v }))} />
            <Toggle label={t('settings.desktopNotifications')} checked={prefs.desktopNotifications} onChange={(v) => setPrefs((s) => ({ ...s, desktopNotifications: v }))} />
            <div className="row">
              <button type="button" className="btn primary" onClick={() => setStep('done')}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        );
      case 'done':
        return (
          <div className="stack">
            <h2>{t('onboard.done.title')}</h2>
            <p>{t('onboard.done.body')}</p>
            <div className="row">
              <button type="button" className="btn primary" autoFocus onClick={() => void finish()}>
                {t('common.start')}
              </button>
            </div>
          </div>
        );
    }
  })();

  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  return (
    <div className="onboard">
      <div className="card stack" style={{ gap: 16 }}>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Mocchi mood={step === 'welcome' ? 'happy' : step === 'done' ? 'celebrating' : mood} scale={step === 'exam' ? 2 : 4} animate={animate} />
        </div>
        <div className="panel">{body}</div>
      </div>
    </div>
  );
}
