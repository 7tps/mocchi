import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterMood, PlacementResult, SessionType } from '@jc/shared-types';
import { SKILL_LABELS, levelLabel, t } from '@jc/design-system';
import { jlptProgress } from '@jc/learning-engine';
import type { SnoozeKind } from '@jc/app-core';
import { api, desktop } from './bridge';
import { useAppState } from './hooks';
import { Mocchi } from './components/Mocchi';
import { SessionRunner } from './components/SessionRunner';
import { Meter, PixelIcon } from './components/ui';
import { PlacementFlow } from './screens/Onboarding';

function params(): URLSearchParams {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

function sourceFromHash(): SessionType {
  const s = params().get('source');
  return s === 'scheduled' ? 'scheduled' : s === 'review' ? 'review' : 'manual';
}

/** Short result card shown in the pop-up when the placement exam ends. */
function ExamDone({ result, onboarded, onClose }: { result: PlacementResult; onboarded: boolean; onClose: () => void }) {
  const band = result.band === 'pre-N5' ? 'Pre-N5' : `${result.bandConfident ? '' : '≈ '}${result.band}`;
  const overall = jlptProgress(result.overallAbility);
  return (
    <div className="stack" aria-live="polite">
      <h2 className="display" style={{ margin: 0 }}>
        {t('onboard.exam.done')}
      </h2>
      <div className="row spread">
        <span className="dim small">{t('onboard.results.band')}</span>
        <span className="display" style={{ fontSize: 22 }}>
          {band}
        </span>
      </div>
      <div className="small dim">{levelLabel(overall)}</div>
      <Meter value={overall.percent} max={100} label={t('level.overall')} />
      {result.strengths.length ? <div className="small">{t('onboard.results.strengths')}: {result.strengths.map((s) => SKILL_LABELS[s]).join(', ')}</div> : null}
      {result.weaknesses.length ? <div className="small">{t('onboard.results.weaknesses')}: {result.weaknesses.map((s) => SKILL_LABELS[s]).join(', ')}</div> : null}
      <button type="button" className="btn primary" autoFocus onClick={onClose}>
        {onboarded ? t('common.done') : t('onboard.exam.seeResults')}
      </button>
    </div>
  );
}

/** Check-ins ask first: a small card, and questions only after "Start questions". */
function Invite({ onStart, onLater, onNotNow, questions }: { onStart: () => void; onLater: () => void; onNotNow: () => void; questions: number }) {
  const [due, setDue] = useState<number | null>(null);
  useEffect(() => {
    api
      .getReviewQueue()
      .then((q) => setDue(q.filter((e) => (e.nextReviewAt ?? Infinity) <= Date.now()).length))
      .catch(() => setDue(0));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);
  return (
    <div className="stack invite" style={{ gap: 8 }} role="alertdialog" aria-labelledby="invite-title">
      <div>
        <div id="invite-title" style={{ fontWeight: 600 }}>
          {t('invite.title')}
        </div>
        <div className="dim small">{due === null ? '\u00a0' : due > 0 ? t('invite.due', { n: due, s: due === 1 ? '' : 's', q: questions }) : t('invite.new', { q: questions })}</div>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
        <button type="button" className="btn primary small" onClick={onStart}>
          {t('invite.start')}
        </button>
        <button type="button" className="btn ghost small" onClick={onLater}>
          {t('invite.later')}
        </button>
        <button type="button" className="btn ghost small" onClick={onNotNow}>
          {t('invite.notNow')}
        </button>
      </div>
    </div>
  );
}

/** Compact always-on-top quiz pop-up. Always closable: ✕, Esc, or snooze. */
export function QuizApp() {
  const { state } = useAppState();
  const [placement] = useState(() => params().get('mode') === 'placement');
  const [type] = useState<SessionType>(sourceFromHash);
  const [mood, setMood] = useState<CharacterMood>('curious');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [examResult, setExamResult] = useState<PlacementResult | null>(null);
  const [inviting, setInviting] = useState(() => !placement && type === 'scheduled');
  const sessionId = useRef<string | null>(null);
  const onboarded = !!state?.onboarded;

  /** `declined`: closing a check-in invite counts as skipping it; snoozing doesn't. */
  const close = useCallback(async (declined = true) => {
    if (inviting && declined) await api.declineCheckIn().catch(() => undefined);
    if (sessionId.current) await api.dismissSession(sessionId.current).catch(() => undefined);
    sessionId.current = null;
    // An unfinished exam is saved; during onboarding, bring the setup window back.
    if (placement && !onboarded) await desktop.openMain();
    await desktop.closeQuiz();
  }, [placement, onboarded, inviting]);

  const snooze = async (kind: SnoozeKind) => {
    await api.snooze(kind);
    await close(false);
  };

  const start = useCallback(async () => {
    await desktop.expandQuiz();
    setInviting(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!state) return null;
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  const extra = !placement && (type === 'manual' || type === 'review');

  return (
    <div className="quiz-shell">
      <header className="quiz-head">
        <Mocchi mood={mood} cosmetic={state.character.selectedCosmetic} scale={1.25} animate={animate} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="display">{placement ? t('onboard.exam.title') : t('app.name')}</span>
          {extra ? (
            <span className="faint small" style={{ display: 'block', lineHeight: 1.1 }} title={t('quiz.extraHint')}>
              {t('quiz.extra')}
            </span>
          ) : null}
        </span>
        {!placement && !inviting ? (
          <div className="menu" style={{ position: 'relative' }}>
            <button type="button" className="btn ghost small" aria-haspopup="menu" aria-expanded={snoozeOpen} onClick={() => setSnoozeOpen((v) => !v)}>
              <PixelIcon name="clock" size={14} /> {t('quiz.snooze')}
            </button>
            {snoozeOpen ? (
              <div className="panel stack" role="menu" style={{ position: 'absolute', right: 0, top: 34, zIndex: 5, padding: 8, gap: 4, minWidth: 150 }}>
                <button role="menuitem" type="button" className="btn small" onClick={() => void snooze('15m')}>
                  {t('quiz.snooze15')}
                </button>
                <button role="menuitem" type="button" className="btn small" onClick={() => void snooze('1h')}>
                  {t('quiz.snooze1h')}
                </button>
                <button role="menuitem" type="button" className="btn small" onClick={() => void snooze('rest-of-day')}>
                  {t('quiz.snoozeDay')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <button type="button" className="btn ghost icon" aria-label={t('common.close')} title={`${t('common.close')} (Esc)`} onClick={() => void close()}>
          <PixelIcon name="close" size={14} />
        </button>
      </header>
      <main className="quiz-body">
        {placement ? (
          examResult ? (
            <ExamDone
              result={examResult}
              onboarded={onboarded}
              onClose={async () => {
                if (!onboarded) await desktop.openMain();
                await desktop.closeQuiz();
              }}
            />
          ) : (
            <PlacementFlow
              state={state}
              onMood={setMood}
              onDone={(r) => {
                setExamResult(r);
                setMood('celebrating');
              }}
            />
          )
        ) : inviting ? (
          <Invite questions={state.settings.sessionLength} onStart={() => void start()} onLater={() => void snooze('15m')} onNotNow={() => void close()} />
        ) : (
          <SessionRunner type={type} state={state} autoFocus onMood={setMood} onClose={() => void close()} onSession={(id) => (sessionId.current = id)} />
        )}
      </main>
    </div>
  );
}
