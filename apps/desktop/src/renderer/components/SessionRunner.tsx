import { useEffect, useRef, useState } from 'react';
import type { AnswerFeedback, AppState, SessionSummary, SessionView } from '@jc/app-core';
import type { AnswerMeta, CharacterMood, SessionType } from '@jc/shared-types';
import { COSMETICS, MILESTONES } from '@jc/learning-engine';
import { t } from '@jc/design-system';
import { api } from '../bridge';
import { playSfx } from '../audio';
import { QuestionCard } from './QuestionCard';
import { Meter } from './ui';

interface Props {
  type: SessionType;
  reviewOnly?: boolean;
  state: AppState;
  autoFocus: boolean;
  onMood: (m: CharacterMood) => void;
  onClose: () => void;
  /** Called with the running session id so the host can dismiss it on close. */
  onSession?: (id: string | null) => void;
  allowAnother?: boolean;
}

export function SessionRunner({ type, reviewOnly, state, autoFocus, onMood, onClose, onSession, allowAnother }: Props) {
  const [session, setSession] = useState<SessionView | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const sound = state.settings.soundEffects;
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;
  const onMoodRef = useRef(onMood);
  onMoodRef.current = onMood;

  useEffect(() => {
    let cancelled = false;
    setSession(undefined);
    setIndex(0);
    setFeedback(null);
    setResults([]);
    setSummary(null);
    api
      .startSession(type, { reviewOnly })
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        onSessionRef.current?.(s?.id ?? null);
        onMoodRef.current(s ? 'thinking' : 'happy');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [type, reviewOnly, round]);

  if (error) return <div role="alert">{t('common.error', { message: error })}</div>;
  if (session === undefined) return <div className="dim">{t('common.loading')}</div>;
  if (session === null) {
    return (
      <div className="stack">
        <p>{t('quiz.nothing')}</p>
        <button type="button" className="btn primary" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    );
  }

  const q = session.questions[index];

  const submit = async (response: string | string[], latencyMs: number | undefined, meta: AnswerMeta) => {
    if (!q) return;
    setBusy(true);
    try {
      const fb = await api.answerQuestion(session.id, q.id, response, latencyMs, meta);
      setFeedback(fb);
      setResults((r) => [...r, fb.correct]);
      onMood(fb.mood);
      if (sound && !fb.dontKnow) playSfx(fb.correct ? 'correct' : 'wrong');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    setFeedback(null);
    if (index + 1 < session.questions.length) {
      setIndex(index + 1);
      onMood('thinking');
      return;
    }
    setBusy(true);
    try {
      const s = await api.finishSession(session.id);
      onSession?.(null);
      setSummary(s);
      onMood(s.mood);
      if (sound) playSfx('complete');
    } finally {
      setBusy(false);
    }
  };

  if (summary) {
    const unlocks = summary.newUnlocks.map((id) => COSMETICS.find((c) => c.id === id)?.name ?? id);
    const milestones = summary.newMilestones.map((id) => MILESTONES.find((m) => m.id === id)?.title ?? id);
    return (
      <div className="stack" aria-live="polite">
        <h2 className="display" style={{ margin: 0 }}>
          {t('quiz.summary')}
        </h2>
        <div className="row spread">
          <span>{t('quiz.summaryScore', { correct: summary.correct, total: summary.answered })}</span>
          <span className="tag good">{t('quiz.xp', { xp: summary.xp })}</span>
        </div>
        <div>
          <div className="row spread small dim">
            <span>{t('character.level', { level: summary.level.level })}</span>
            <span>
              {summary.level.into} / {summary.level.needed} XP
            </span>
          </div>
          <Meter value={summary.level.into} max={summary.level.needed} label="XP" />
        </div>
        {summary.dailyGoal > 0 ? (
          <div>
            <div className="small dim">{summary.goalReached ? t('quiz.goal') : t('quiz.goalProgress', { n: summary.questionsToday, goal: summary.dailyGoal })}</div>
            <Meter value={Math.min(summary.questionsToday, summary.dailyGoal)} max={summary.dailyGoal} variant="teal" label={t('home.goal')} />
          </div>
        ) : null}
        {summary.leveledUp ? <div className="tag warn">{t('quiz.levelUp', { level: summary.level.level })}</div> : null}
        {unlocks.map((u) => (
          <div key={u} className="tag good">
            {t('quiz.unlocked', { name: u })}
          </div>
        ))}
        {milestones.map((m) => (
          <div key={m} className="tag">
            ★ {m}
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn primary" onClick={onClose} autoFocus={autoFocus}>
            {t('common.done')}
          </button>
          {allowAnother ? (
            <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
              {t('home.start')}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!q) return null;
  const last = index + 1 >= session.questions.length;
  return (
    <div className="stack">
      <div className="steps" aria-label={t('quiz.progress', { n: index + 1, total: session.questions.length })}>
        {session.questions.map((sq, i) => (
          <span key={sq.id} className={i < results.length ? (results[i] ? 'done' : 'miss') : i === index ? 'now' : ''} />
        ))}
      </div>
      <QuestionCard
        question={q}
        feedback={feedback}
        busy={busy}
        onSubmit={submit}
        onContinue={() => void next()}
        continueLabel={last ? t('quiz.finish') : t('quiz.next')}
        showRomaji={state.settings.showRomaji}
        showTranslations={state.settings.showTranslations}
        autoFocus={autoFocus}
        reason={feedback?.reason}
        extra={
          q.skill === 'kanji' && q.mode === 'choice' ? (
            <button type="button" className="btn ghost small" onClick={() => void submit('', undefined, { dontKnow: true })} disabled={busy}>
              {t('quiz.dontKnow')}
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
