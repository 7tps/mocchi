import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Feedback, PublicQuestion } from '@jc/app-core';
import type { AnswerMeta } from '@jc/shared-types';
import { hasJapanese, isKanaString, kanaToRomaji } from '@jc/shared-utils';
import { t } from '@jc/design-system';
import { speak } from '../audio';
import { PixelIcon } from './ui';

interface Props {
  question: PublicQuestion;
  feedback: Feedback | null;
  onSubmit: (response: string | string[], latencyMs: number, meta: AnswerMeta) => void;
  onContinue: () => void;
  continueLabel: string;
  showRomaji: boolean;
  showTranslations: boolean;
  autoFocus: boolean;
  busy?: boolean;
  extra?: ReactNode;
  reason?: string;
  /** Placement: offer "I can't read the kanji" when no reading can be shown. */
  onCantReadKanji?: () => void;
}

/** Readings shown up front: conjugation tests the verb, not its kanji. */
const READING_BY_DEFAULT = new Set(['conjugate']);

export function QuestionCard({ question: q, feedback, onSubmit, onContinue, continueLabel, showRomaji, showTranslations, autoFocus, busy, extra, reason, onCantReadKanji }: Props) {
  const started = useRef(performance.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [showReading, setShowReading] = useState(READING_BY_DEFAULT.has(q.format));
  const [showContextReading, setShowContextReading] = useState(false);
  const [showContextEn, setShowContextEn] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  // Revealed before answering? Sent with the answer so it counts against kanji only.
  const revealed = useRef(false);
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  // Reset per question.
  useEffect(() => {
    started.current = performance.now();
    revealed.current = false;
    setSelected(null);
    setTyped('');
    setPicked([]);
    setShowReading(READING_BY_DEFAULT.has(q.format));
    setShowContextReading(false);
    setShowContextEn(false);
    setExpanded(false);
    setShowWhy(false);
    if (q.format === 'listening' && q.speak) speak(q.speak);
    if (autoFocus && q.mode === 'typed') setTimeout(() => inputRef.current?.focus(), 30);
  }, [q.id, q.format, q.mode, q.speak, autoFocus]);

  useEffect(() => {
    if (feedback && autoFocus) continueRef.current?.focus();
  }, [feedback, autoFocus]);

  const latency = () => Math.round(performance.now() - started.current);
  const done = !!feedback;
  const meta = (): AnswerMeta => (revealed.current ? { readingShown: true } : {});
  const kanjiDependent = q.kanjiDifficulty !== undefined;
  const canReveal = !!(q.promptReading || q.contextReading);

  const reveal = (which: 'prompt' | 'context') => {
    if (!done && kanjiDependent) revealed.current = true;
    if (which === 'prompt') setShowReading((v) => !v);
    else setShowContextReading((v) => !v);
  };

  const submitChoice = (c: string) => {
    if (done || busy) return;
    setSelected(c);
    onSubmit(c, latency(), meta());
  };

  const submitTyped = () => {
    if (done || busy || !typed.trim()) return;
    setSelected(typed);
    onSubmit(typed, latency(), meta());
  };

  const tokens = q.tokens ?? [];
  const submitArrange = () => {
    if (done || busy || picked.length !== tokens.length) return;
    onSubmit(picked.map((i) => tokens[i] as string), latency(), meta());
  };

  // Keyboard: 1–4 pick a choice, Enter continues after feedback.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || composing.current) return;
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (done && (e.key === 'Enter' || (e.key === ' ' && !inField))) {
        if (target?.tagName === 'BUTTON' && target !== continueRef.current) return;
        e.preventDefault();
        onContinue();
        return;
      }
      if (!done && q.mode === 'choice' && !inField && /^[1-9]$/.test(e.key)) {
        const c = q.choices?.[Number(e.key) - 1];
        if (c) submitChoice(c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const promptIsJa = hasJapanese(q.prompt);
  const romaji = useMemo(() => {
    const src = q.promptReading ?? q.prompt;
    if (!showRomaji || (q.promptReading && !showReading)) return null;
    return isKanaString(src.replace(/[、。\s]/g, '')) ? kanaToRomaji(src) : null;
  }, [q.prompt, q.promptReading, showRomaji, showReading]);

  const choiceClass = (c: string) => {
    if (!feedback) return 'choice';
    if (c === feedback.answer) return 'choice correct';
    if (c === selected) return 'choice wrong';
    return 'choice';
  };

  const longChoices = (q.choices ?? []).some((c) => c.length > 16);
  const explanation = feedback?.explanation ?? '';
  const shortExplanation = explanation.length > 150 && !expanded ? `${explanation.slice(0, 140)}…` : explanation;

  return (
    <div className="qcard">
      <div className="instruction">{q.instruction}</div>

      {q.context ? (
        <div>
          <div className="context jp" lang="ja">
            {q.context}
            {showContextReading && q.contextReading ? <div className="dim small" style={{ marginTop: 6 }}>{q.contextReading}</div> : null}
            {showContextEn && q.contextEn ? <div className="faint small" style={{ marginTop: 6 }}>{q.contextEn}</div> : null}
          </div>
          <div className="row" style={{ marginTop: 4 }}>
            {q.contextReading ? (
              <button type="button" className="btn ghost small" onClick={() => reveal('context')} aria-pressed={showContextReading}>
                {t('quiz.showReading')}
              </button>
            ) : null}
            {q.contextEn && done ? (
              <button type="button" className="btn ghost small" onClick={() => setShowContextEn((v) => !v)} aria-pressed={showContextEn}>
                {t('quiz.showTranslation')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {q.format === 'listening' ? (
        <div className="prompt">
          <button type="button" className="btn primary" onClick={() => q.speak && speak(q.speak)} aria-label={t('quiz.play')}>
            <PixelIcon name="play" /> {t('quiz.play')}
          </button>
        </div>
      ) : q.prompt ? (
        <div className={`prompt ${promptIsJa ? 'jp' : 'en'} ${q.prompt.length > 14 && promptIsJa ? 'long' : ''}`} lang={promptIsJa ? 'ja' : 'en'}>
          {q.prompt}
          {q.promptReading && (showReading || done) ? <span className="reading">{q.promptReading}</span> : null}
          {romaji ? <span className="sub">{romaji}</span> : null}
          {q.promptSub && (showTranslations || q.format === 'word-to-reading' || q.format === 'en-to-ja' || q.format === 'conjugate' || q.format === 'kanji-reading') ? <span className="sub">{q.promptSub}</span> : null}
        </div>
      ) : null}
      {q.promptReading && !READING_BY_DEFAULT.has(q.format) && !done && !showReading ? (
        <div>
          <button type="button" className="btn ghost small" onClick={() => reveal('prompt')}>
            {t('quiz.showReading')}
          </button>
          {kanjiDependent ? <span className="faint small"> {t('quiz.revealCost')}</span> : null}
        </div>
      ) : null}

      {q.mode === 'choice' && q.choices ? (
        <div className={`choices ${longChoices ? 'single' : ''}`} role="group" aria-label={q.instruction}>
          {q.choices.map((c, i) => (
            <button key={c} type="button" className={choiceClass(c)} disabled={done || busy} onClick={() => submitChoice(c)} lang={hasJapanese(c) ? 'ja' : 'en'}>
              <span className="key" aria-hidden>
                {i + 1}
              </span>
              <span className={hasJapanese(c) ? 'jp' : ''}>{c}</span>
              {q.choiceHints?.[i] ? <span className="hint jp">{q.choiceHints[i]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {q.mode === 'typed' ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submitTyped();
          }}
        >
          <input
            ref={inputRef}
            className="input jp"
            style={{ fontSize: 20 }}
            value={typed}
            disabled={done}
            lang={q.answerScript === 'english' ? 'en' : 'ja'}
            placeholder={t('quiz.typeHere')}
            aria-label={t('quiz.typeHere')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={() => (composing.current = false)}
            onKeyDown={(e) => {
              // Enter that confirms an IME conversion must not submit the answer.
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || composing.current)) e.preventDefault();
            }}
          />
          {q.answerScript !== 'english' ? <span className="faint small">{t('quiz.typeHint')}</span> : null}
          {!done ? (
            <button type="submit" className="btn primary" disabled={!typed.trim() || busy}>
              {t('quiz.check')}
            </button>
          ) : null}
        </form>
      ) : null}

      {q.mode === 'arrange' ? (
        <div className="stack">
          <div className="tokens" aria-label="Your sentence">
            {picked.map((i, n) => (
              <button key={`${i}-${n}`} type="button" className="token jp" disabled={done} onClick={() => setPicked((p) => p.filter((_, k) => k !== n))}>
                {tokens[i]}
              </button>
            ))}
          </div>
          <div className="tokens" style={{ borderStyle: 'solid' }} aria-label="Available words">
            {tokens.map((tok, i) =>
              picked.includes(i) ? null : (
                <button key={`${tok}-${i}`} type="button" className="token jp" disabled={done} onClick={() => setPicked((p) => [...p, i])}>
                  {tok}
                </button>
              ),
            )}
          </div>
          {!done ? (
            <div className="row">
              <button type="button" className="btn primary" disabled={picked.length !== tokens.length || busy} onClick={submitArrange}>
                {t('quiz.check')}
              </button>
              <button type="button" className="btn ghost small" onClick={() => setPicked([])}>
                {t('quiz.reset')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!done && (extra || (onCantReadKanji && kanjiDependent)) ? (
        <div className="stack" style={{ gap: 4 }}>
          <div className="row">
            {extra}
            {onCantReadKanji && kanjiDependent && !canReveal ? (
              <button type="button" className="btn ghost small" onClick={onCantReadKanji} disabled={busy}>
                {t('quiz.cantReadKanji')}
              </button>
            ) : null}
          </div>
          {onCantReadKanji && kanjiDependent ? <span className="faint small">{canReveal ? t('quiz.kanjiHint') : t('quiz.kanjiHintNoReading')}</span> : null}
        </div>
      ) : null}

      {feedback ? (
        <div className={`feedback ${feedback.skipped || feedback.dontKnow ? '' : feedback.correct ? 'good' : 'bad'}`} role="status" aria-live="polite">
          <div className="row spread">
            <span className="verdict">{feedback.skipped ? t('quiz.skippedKanji') : feedback.dontKnow ? t('quiz.dontKnowVerdict') : feedback.correct ? t('quiz.correct') : t('quiz.incorrect')}</span>
            {feedback.note ? <span className="dim small jp">{feedback.note}</span> : null}
          </div>
          {!feedback.correct ? (
            <div style={{ marginTop: 4 }}>
              <span className="dim small">{t('quiz.answer')}: </span>
              <span className="answer jp" lang="ja">
                {feedback.answer}
              </span>
            </div>
          ) : null}
          {feedback.whyWrong ? (
            <p className="small why-wrong" style={{ margin: '6px 0 0' }}>
              <span className="dim">{selected && typeof selected === 'string' ? t('quiz.whyNot', { answer: selected }) : t('quiz.whyNotYours')}: </span>
              <span className="jp">{feedback.whyWrong}</span>
            </p>
          ) : null}
          {explanation ? (
            <p className="small" style={{ margin: '6px 0 0' }}>
              {!feedback.correct ? <span className="dim">{t('quiz.whyRight')}: </span> : null}
              {shortExplanation}{' '}
              {explanation.length > 150 ? (
                <button type="button" className="btn ghost small" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? t('quiz.less') : t('quiz.more')}
                </button>
              ) : null}
            </p>
          ) : null}
          {feedback.example && (expanded || explanation.length <= 150) ? (
            <div className="example">
              <div className="jp" lang="ja">
                {feedback.example.ja}
              </div>
              <div className="dim small jp">{feedback.example.reading}</div>
              {showTranslations ? <div className="faint small">{feedback.example.en}</div> : null}
            </div>
          ) : null}
          {reason ? (
            <div style={{ marginTop: 6 }}>
              <button type="button" className="btn ghost small" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy}>
                {t('quiz.why')}
              </button>
              {showWhy ? <span className="faint small"> {reason}</span> : null}
            </div>
          ) : null}
          <div className="row" style={{ marginTop: 10 }}>
            <button ref={continueRef} type="button" className="btn primary" onClick={onContinue}>
              {continueLabel}
            </button>
            <span className="faint small">Enter ↵</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
