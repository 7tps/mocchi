import { useState } from 'react';
import type { AppState } from '@jc/app-core';
import type { CharacterMood } from '@jc/shared-types';
import { SKILL_LABELS, habitLine, levelLabel, lineFor, relativeTime, t } from '@jc/design-system';
import { jlptProgress, restingMood } from '@jc/learning-engine';
import { api } from '../bridge';
import { useLoad } from '../hooks';
import { Mocchi } from '../components/Mocchi';
import { SessionRunner } from '../components/SessionRunner';
import { Meter, PixelIcon, Stat } from '../components/ui';

const STATUS_TAG: Record<string, string> = { learning: 'warn', relearning: 'bad', reviewing: '', retained: 'good', new: '' };

export function Home({ state, go }: { state: AppState; go: (route: string) => void }) {
  const { data } = useLoad(() => api.getDashboard(), []);
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  const paused = state.pause.indefinite || state.pause.until !== null;
  const name = state.profile?.displayName;
  if (!data) return <div className="dim">{t('common.loading')}</div>;
  const s = data.stats;
  const goal = state.settings.dailyGoalQuestions;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="panel hero">
        <Mocchi mood={restingMood(state.habit, { paused, due: s.dueNow })} cosmetic={state.character.selectedCosmetic} scale={4} animate={animate} />
        <div className="stack">
          <div>
            <h1 style={{ margin: 0 }}>
              {t('home.greeting')}
              {name ? `, ${name}` : ''}!
            </h1>
            <div className="jp dim" lang="ja">
              {lineFor('greet', s.questionsAnswered).ja}
            </div>
            <div className="small">{habitLine(state.habit)}</div>
          </div>
          <div className="row">
            <span className="tag">
              <PixelIcon name="flame" size={12} /> {t('home.streak', { n: s.streakDays })}
            </span>
            <span className="tag">
              {t('home.level')} {data.level.level}
            </span>
            <span className="tag" title={t('onboard.results.approx')}>
              ≈ {data.band}
            </span>
            {paused ? <span className="tag warn">{t('home.paused')}</span> : null}
          </div>
          <div>
            <div className="row spread small dim">
              <span>{t('home.goal')}</span>
              <span>{t('quiz.goalProgress', { n: s.questionsToday, goal })}</span>
            </div>
            <Meter value={Math.min(s.questionsToday, goal)} max={goal || 1} variant="teal" label={t('home.goal')} />
          </div>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => go('learn')}>
              {t('home.start')}
            </button>
            <button type="button" className="btn" disabled={s.dueNow === 0} onClick={() => go('learn/review')}>
              {t('home.review')} · {t('home.due', { n: s.dueNow })}
            </button>
            {paused ? (
              <button type="button" className="btn ghost" onClick={() => void api.resume()}>
                {t('home.resume')}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid stats">
        <Stat label={t('progress.vocab')} value={s.vocabulary.introduced} sub={`${s.vocabulary.retained} retained`} />
        <Stat label={t('progress.accuracy')} value={s.recentAccuracy === null ? '—' : `${Math.round(s.recentAccuracy * 100)}%`} />
        <Stat label={t('progress.learning')} value={s.counts.learning} />
        <Stat label="Due today" value={s.dueToday} />
      </div>

      <div className="grid two">
        <section className="panel">
          <h3>{t('home.recent')}</h3>
          {data.recent.length === 0 ? (
            <p className="dim">{t('home.empty')}</p>
          ) : (
            <div className="list">
              {data.recent.map((r) => (
                <div key={r.id} className="list-item" style={{ cursor: 'default' }}>
                  <span className="ja jp" lang="ja">
                    {r.ja}
                  </span>
                  <span className="small">
                    {r.reading && r.reading !== r.ja ? <span className="jp dim">{r.reading} · </span> : null}
                    {r.meaning}
                  </span>
                  <span className={`tag ${STATUS_TAG[r.status] ?? ''}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h3>{t('home.weakest')}</h3>
          <div className="stack">
            {data.weakest.map((sk) => {
              const est = s.skills.find((x) => x.skill === sk);
              const p = jlptProgress(est?.ability ?? 0, sk);
              return (
                <div key={sk}>
                  <div className="row spread small">
                    <span>{SKILL_LABELS[sk]}</span>
                    <span className="dim">
                      {levelLabel(p)} · {est && est.evidence > 0 ? t('level.recent', { percent: Math.round(est.recentAccuracy * 100) }) : t('level.notPracticed')}
                    </span>
                  </div>
                  <Meter value={p.percent} max={100} label={SKILL_LABELS[sk]} />
                </div>
              );
            })}
          </div>
          {data.nextReminder ? <p className="faint small">Next reminder {relativeTime(Date.parse(data.nextReminder), Date.now())}</p> : null}
        </section>
      </div>
    </div>
  );
}

export function Learn({ state, reviewOnly, go }: { state: AppState; reviewOnly: boolean; go: (r: string) => void }) {
  const [mood, setMood] = useState<CharacterMood>('thinking');
  const [running, setRunning] = useState<string | null>(null);
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 180px', alignItems: 'start' }}>
      <section className="panel" style={{ maxWidth: 620 }}>
        <SessionRunner
          type={reviewOnly ? 'review' : 'manual'}
          reviewOnly={reviewOnly}
          state={state}
          autoFocus
          onMood={setMood}
          onSession={setRunning}
          allowAnother
          onClose={() => {
            if (running) void api.dismissSession(running);
            go('home');
          }}
        />
      </section>
      <div className="stack" style={{ alignItems: 'center', position: 'sticky', top: 0 }}>
        <Mocchi mood={mood} cosmetic={state.character.selectedCosmetic} scale={5} animate={animate} />
      </div>
    </div>
  );
}
