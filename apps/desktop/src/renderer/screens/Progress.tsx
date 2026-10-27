import { useState } from 'react';
import type { AppState, LibraryEntry, LibraryFilter } from '@jc/app-core';
import { SKILL_LABELS, levelLabel, relativeTime, t } from '@jc/design-system';
import { jlptProgress } from '@jc/learning-engine';
import { api } from '../bridge';
import { useLoad } from '../hooks';
import { Meter, Stat } from '../components/ui';

export function Progress() {
  const { data } = useLoad(() => api.getDashboard(), []);
  if (!data) return <div className="dim">{t('common.loading')}</div>;
  const s = data.stats;
  const maxForecast = Math.max(1, ...s.forecast.map((f) => f.count));
  const minutes = Math.round(s.totalStudyMs / 60000);
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>{t('nav.progress')}</h1>
      <div className="grid stats">
        <Stat label={t('progress.answered')} value={s.questionsAnswered} />
        <Stat label={t('progress.accuracy')} value={s.recentAccuracy === null ? '—' : `${Math.round(s.recentAccuracy * 100)}%`} />
        <Stat label={t('progress.retention')} value={s.retention === null ? '—' : `${Math.round(s.retention * 100)}%`} sub={s.retention === null ? t('progress.none') : 'on repeat reviews, 30 days'} />
        <Stat label={t('progress.time')} value={minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} h`} sub={`${s.sessionsCompleted} sessions`} />
        <Stat label={t('progress.streak')} value={s.streakDays} sub={`${t('progress.longest')}: ${s.longestStreak}`} />
        <Stat label={t('progress.vocab')} value={s.vocabulary.introduced} />
        <Stat label={t('progress.kanji')} value={s.kanjiReviewed} />
        <Stat label={t('progress.grammar')} value={s.grammarPracticed} />
      </div>
      <div className="grid two">
        <section className="panel">
          <h3>{t('progress.items')}</h3>
          <div className="stack">
            {(['learning', 'reviewing', 'retained'] as const).map((k) => (
              <div key={k}>
                <div className="row spread small">
                  <span>{t(`progress.${k}`)}</span>
                  <span className="dim">{s.counts[k]}</span>
                </div>
                <Meter value={s.counts[k]} max={Math.max(1, s.counts.introduced)} label={t(`progress.${k}`)} variant={k === 'retained' ? undefined : 'teal'} />
              </div>
            ))}
            <p className="faint small" style={{ margin: 0 }}>
              {s.counts.introduced} {t('progress.introduced').toLowerCase()}. {t('progress.retainedNote')}
            </p>
          </div>
        </section>
        <section className="panel">
          <h3>{t('progress.forecast')}</h3>
          <div className="bars" role="img" aria-label={s.forecast.map((f) => `${f.date}: ${f.count}`).join(', ')}>
            {s.forecast.map((f) => (
              <div key={f.date} className="bar">
                <span className="small dim">{f.count}</span>
                <span className="fill" style={{ height: `${(f.count / maxForecast) * 70}%` }} />
                <span className="faint small">{new Date(`${f.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <h3>{t('progress.skills')}</h3>
        <div className="grid two">
          {s.skills
            .filter((k) => k.evidence > 0 || k.ability > 0.5)
            .map((k) => {
              const p = jlptProgress(k.ability, k.skill);
              return (
                <div key={k.skill}>
                  <div className="row spread small">
                    <span>{SKILL_LABELS[k.skill]}</span>
                    <span>
                      {levelLabel(p)} <span className="dim">· {t('level.recent', { percent: Math.round(k.recentAccuracy * 100) })}</span>
                    </span>
                  </div>
                  <Meter value={p.percent} max={100} label={SKILL_LABELS[k.skill]} variant="teal" />
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

const TYPES: Array<NonNullable<LibraryFilter['type']>> = ['vocab', 'kanji', 'grammar', 'kana', 'expression', 'particle', 'all'];
const TYPE_LABEL: Record<string, string> = {
  vocab: t('library.vocab'), kanji: t('library.kanji'), grammar: t('library.grammar'), kana: t('library.kana'), expression: t('library.expression'), particle: t('library.particle'), all: t('library.all'),
};

function EntryRow({ e, open, onToggle }: { e: LibraryEntry; open: boolean; onToggle: () => void }) {
  return (
    <>
      <button type="button" className="list-item" onClick={onToggle} aria-expanded={open}>
        <span className="ja jp" lang="ja">
          {e.ja}
        </span>
        <span className="small">
          {e.reading && e.reading !== e.ja ? <span className="jp dim">{e.reading} · </span> : null}
          {e.meaning}
        </span>
        <span className="row" style={{ gap: 4 }}>
          {e.jlpt ? <span className="tag">{e.jlpt}</span> : null}
          <span className={`tag ${e.status === 'retained' ? 'good' : e.status === 'learning' || e.status === 'relearning' ? 'warn' : ''}`}>{e.status}</span>
        </span>
      </button>
      {open ? (
        <div className="panel alt small" style={{ margin: '4px 0 8px' }}>
          {e.notes ? <p style={{ marginTop: 0 }}>{e.notes}</p> : null}
          {e.examples.map((x) => (
            <div key={x.ja} className="example">
              <div className="jp" lang="ja">
                {x.ja}
              </div>
              <div className="dim jp">{x.reading}</div>
              <div className="faint">{x.en}</div>
            </div>
          ))}
          <p className="faint" style={{ marginBottom: 0 }}>
            {e.attempts} attempts{e.accuracy !== null ? ` · ${Math.round(e.accuracy * 100)}% correct` : ''}
            {e.nextReviewAt ? ` · next review ${relativeTime(e.nextReviewAt, Date.now())}` : ''}
          </p>
        </div>
      ) : null}
    </>
  );
}

export function Library({ review = false }: { state?: AppState; review?: boolean }) {
  const [type, setType] = useState<NonNullable<LibraryFilter['type']>>('vocab');
  const [status, setStatus] = useState<NonNullable<LibraryFilter['status']>>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { data } = useLoad(() => (review ? api.getReviewQueue() : api.getLibrary({ type, status, search, limit: 400 })), [type, status, search, review]);
  return (
    <div className="stack">
      <h1>{review ? t('nav.review') : t('nav.library')}</h1>
      {!review ? (
        <>
          <input className="input" type="search" placeholder={t('library.search')} aria-label={t('library.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="chips" role="group" aria-label="Type">
            {TYPES.map((ty) => (
              <button key={ty} type="button" className="chip" aria-pressed={type === ty} onClick={() => setType(ty)}>
                {TYPE_LABEL[ty]}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Status">
            {(['all', 'introduced', 'learning', 'retained', 'new'] as const).map((st) => (
              <button key={st} type="button" className="chip" aria-pressed={status === st} onClick={() => setStatus(st)}>
                {st === 'all' ? t('library.all') : st === 'new' ? t('library.new') : st === 'introduced' ? t('library.introduced') : t(`progress.${st}`)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="dim">Items due now and within the next 24 hours, soonest first.</p>
      )}
      <section className="panel" style={{ padding: 0 }}>
        {!data ? (
          <p className="dim" style={{ padding: 16 }}>
            {t('common.loading')}
          </p>
        ) : data.length === 0 ? (
          <p className="dim" style={{ padding: 16 }}>
            {review ? t('quiz.nothing') : t('library.empty')}
          </p>
        ) : (
          <div className="list">
            {data.map((e) => (
              <EntryRow key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
