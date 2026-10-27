import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import type { AppState, Feedback, PublicQuestion, SessionSummary, SessionView } from '@jc/app-core';
import type { AnswerMeta, CharacterMood, SessionType } from '@jc/shared-types';
import { COSMETICS, MILESTONES } from '@jc/learning-engine';
import { t, type Theme } from '@jc/design-system';
import { hasJapanese, isKanaString, kanaToRomaji } from '@jc/shared-utils';
import { useTutor } from '../service';
import { celebrate } from '../notifications';
import { FONT_DISPLAY } from '../theme';
import { Body, Button, Meter, Tag, Title } from './ui';

interface CardProps {
  theme: Theme;
  question: PublicQuestion;
  feedback: Feedback | null;
  busy?: boolean;
  onSubmit: (response: string | string[], latencyMs: number, meta: AnswerMeta) => void;
  onContinue: () => void;
  continueLabel: string;
  showRomaji: boolean;
  showTranslations: boolean;
  extra?: React.ReactNode;
  reason?: string;
  /** Placement: offer "I can't read the kanji" when no reading can be shown. */
  onCantReadKanji?: () => void;
}

export function QuestionView({ theme, question: q, feedback, busy, onSubmit, onContinue, continueLabel, showRomaji, showTranslations, extra, reason, onCantReadKanji }: CardProps) {
  const started = useRef(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  // Readings start hidden on kanji prompts; revealing one counts against kanji only.
  const [showReading, setShowReading] = useState(q.format === 'conjugate');
  const revealed = useRef(false);
  const [showContext, setShowContext] = useState(false);
  const [why, setWhy] = useState(false);

  useEffect(() => {
    started.current = Date.now();
    setSelected(null);
    setTyped('');
    setPicked([]);
    setShowReading(q.format === 'conjugate');
    revealed.current = false;
    setShowContext(false);
    setWhy(false);
    if (q.format === 'listening' && q.speak) Speech.speak(q.speak, { language: 'ja-JP', rate: 0.9 });
  }, [q.id, q.format, q.speak]);

  const done = !!feedback;
  const latency = () => Date.now() - started.current;
  const meta = (): AnswerMeta => (revealed.current ? { readingShown: true } : {});
  const kanjiDependent = q.kanjiDifficulty !== undefined;
  const canReveal = !!(q.promptReading || q.contextReading);
  const markReveal = () => {
    if (!done && kanjiDependent) revealed.current = true;
  };
  const tokens = q.tokens ?? [];
  const isJa = hasJapanese(q.prompt);
  const romajiSrc = q.promptReading ?? q.prompt;
  const romaji = showRomaji && isKanaString(romajiSrc.replace(/[、。\s]/g, '')) ? kanaToRomaji(romajiSrc) : null;

  const choiceStyle = (c: string) => {
    let border = theme.borderStrong;
    let bg = theme.surface;
    if (feedback && c === feedback.answer) {
      border = theme.good;
      bg = theme.surfaceAlt;
    } else if (feedback && c === selected) {
      border = theme.bad;
    }
    return { borderColor: border, backgroundColor: bg };
  };

  return (
    <View style={{ gap: 12 }}>
      <Body theme={theme} dim>
        {q.instruction}
      </Body>
      {q.context ? (
        <View style={{ backgroundColor: theme.surface, borderLeftWidth: 4, borderLeftColor: theme.accent, padding: 12 }}>
          <Text style={{ color: theme.text, fontSize: 18, lineHeight: 30 }}>{q.context}</Text>
          {showContext ? <Text style={{ color: theme.textDim, marginTop: 6 }}>{q.contextReading}</Text> : null}
          {showContext && done ? <Text style={{ color: theme.textFaint, marginTop: 6 }}>{q.contextEn}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              markReveal();
              setShowContext((v) => !v);
            }}
            style={{ marginTop: 6 }}
          >
            <Text style={{ color: theme.accent, fontFamily: FONT_DISPLAY }}>{t('quiz.showReading')}</Text>
          </Pressable>
        </View>
      ) : null}
      {q.format === 'listening' ? (
        <Button theme={theme} variant="primary" label={`▶ ${t('quiz.play')}`} onPress={() => q.speak && Speech.speak(q.speak, { language: 'ja-JP', rate: 0.9 })} />
      ) : q.prompt ? (
        <View style={{ borderWidth: 2, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, alignItems: isJa && q.prompt.length > 14 ? 'flex-start' : 'center' }}>
          <Text style={{ color: theme.text, fontSize: isJa ? (q.prompt.length > 14 ? 22 : 36) : 22, fontFamily: isJa ? undefined : FONT_DISPLAY, lineHeight: isJa ? (q.prompt.length > 14 ? 34 : 48) : 30 }}>{q.prompt}</Text>
          {q.promptReading && (showReading || done) ? <Text style={{ color: theme.textDim, fontSize: 15 }}>{q.promptReading}</Text> : null}
          {romaji ? <Text style={{ color: theme.textFaint, fontSize: 13 }}>{romaji}</Text> : null}
          {q.promptSub && (showTranslations || q.format !== 'fill-blank') ? <Text style={{ color: theme.textFaint, fontSize: 13 }}>{q.promptSub}</Text> : null}
        </View>
      ) : null}
      {q.promptReading && !showReading && !done ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            markReveal();
            setShowReading(true);
          }}
        >
          <Text style={{ color: theme.accent, fontFamily: FONT_DISPLAY }}>
            {t('quiz.showReading')} {kanjiDependent ? <Text style={{ color: theme.textFaint, fontFamily: undefined, fontSize: 12 }}>{t('quiz.revealCost')}</Text> : null}
          </Text>
        </Pressable>
      ) : null}

      {q.mode === 'choice' && q.choices ? (
        <View style={{ gap: 8 }}>
          {q.choices.map((c, i) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ disabled: done || !!busy, selected: selected === c }}
              disabled={done || busy}
              onPress={() => {
                setSelected(c);
                onSubmit(c, latency(), meta());
              }}
              style={({ pressed }) => [{ minHeight: 52, borderWidth: 2, borderBottomWidth: pressed ? 2 : 5, padding: 12, justifyContent: 'center' }, choiceStyle(c)]}
            >
              <Text style={{ color: theme.text, fontSize: 17 }}>{c}</Text>
              {q.choiceHints?.[i] ? <Text style={{ color: theme.textFaint, fontSize: 12 }}>{q.choiceHints[i]}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {q.mode === 'typed' ? (
        <View style={{ gap: 8 }}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            editable={!done}
            placeholder={t('quiz.typeHere')}
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('quiz.typeHere')}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (typed.trim() && !done) {
                setSelected(typed);
                onSubmit(typed, latency(), meta());
              }
            }}
            style={{ borderWidth: 2, borderColor: theme.borderStrong, color: theme.text, backgroundColor: theme.bg, fontSize: 20, padding: 12, minHeight: 52 }}
          />
          {q.answerScript !== 'english' ? (
            <Body theme={theme} dim small>
              {t('quiz.typeHint')}
            </Body>
          ) : null}
          {!done ? (
            <Button
              theme={theme}
              variant="primary"
              label={t('quiz.check')}
              disabled={!typed.trim() || busy}
              onPress={() => {
                setSelected(typed);
                onSubmit(typed, latency(), meta());
              }}
            />
          ) : null}
        </View>
      ) : null}

      {q.mode === 'arrange' ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 52, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border, padding: 6 }}>
            {picked.map((i, n) => (
              <Pressable key={`${i}-${n}`} disabled={done} onPress={() => setPicked((p) => p.filter((_, k) => k !== n))} style={{ borderWidth: 2, borderColor: theme.borderStrong, padding: 8, backgroundColor: theme.surface }}>
                <Text style={{ color: theme.text, fontSize: 18 }}>{tokens[i]}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tokens.map((tok, i) =>
              picked.includes(i) ? null : (
                <Pressable key={`${tok}-${i}`} disabled={done} onPress={() => setPicked((p) => [...p, i])} style={{ borderWidth: 2, borderColor: theme.borderStrong, padding: 8, backgroundColor: theme.surface }}>
                  <Text style={{ color: theme.text, fontSize: 18 }}>{tok}</Text>
                </Pressable>
              ),
            )}
          </View>
          {!done ? <Button theme={theme} variant="primary" label={t('quiz.check')} disabled={picked.length !== tokens.length || busy} onPress={() => onSubmit(picked.map((i) => tokens[i] as string), latency(), meta())} /> : null}
        </View>
      ) : null}

      {!done && extra ? extra : null}
      {!done && onCantReadKanji && kanjiDependent ? (
        <View style={{ gap: 4 }}>
          {!canReveal ? <Button theme={theme} variant="ghost" label={t('quiz.cantReadKanji')} onPress={onCantReadKanji} disabled={busy} /> : null}
          <Body theme={theme} dim small>
            {canReveal ? t('quiz.kanjiHint') : t('quiz.kanjiHintNoReading')}
          </Body>
        </View>
      ) : null}

      {feedback ? (
        <View accessibilityLiveRegion="polite" style={{ borderWidth: 2, borderColor: feedback.skipped ? theme.border : feedback.correct ? theme.good : theme.bad, backgroundColor: theme.surface, padding: 12, gap: 6 }}>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: feedback.skipped ? theme.textDim : feedback.correct ? theme.good : theme.bad }}>{feedback.skipped ? t('quiz.skippedKanji') : feedback.correct ? t('quiz.correct') : t('quiz.incorrect')}</Text>
          {feedback.note ? <Body theme={theme} dim small>{feedback.note}</Body> : null}
          {!feedback.correct ? (
            <Text style={{ color: theme.text, fontSize: 20 }}>
              {t('quiz.answer')}: {feedback.answer}
            </Text>
          ) : null}
          {feedback.whyWrong ? (
            <Body theme={theme} small>
              <Text style={{ color: theme.textDim }}>{selected ? t('quiz.whyNot', { answer: selected }) : t('quiz.whyNotYours')}: </Text>
              {feedback.whyWrong}
            </Body>
          ) : null}
          <Body theme={theme} small>
            {!feedback.correct ? <Text style={{ color: theme.textDim }}>{t('quiz.whyRight')}: </Text> : null}
            {feedback.explanation}
          </Body>
          {feedback.example ? (
            <View style={{ borderLeftWidth: 3, borderLeftColor: theme.borderStrong, paddingLeft: 8 }}>
              <Text style={{ color: theme.text }}>{feedback.example.ja}</Text>
              <Text style={{ color: theme.textDim, fontSize: 13 }}>{feedback.example.reading}</Text>
              {showTranslations ? <Text style={{ color: theme.textFaint, fontSize: 13 }}>{feedback.example.en}</Text> : null}
            </View>
          ) : null}
          {reason ? (
            <Pressable accessibilityRole="button" onPress={() => setWhy((v) => !v)}>
              <Text style={{ color: theme.textFaint, fontSize: 13 }}>{why ? reason : t('quiz.why')}</Text>
            </Pressable>
          ) : null}
          <Button theme={theme} variant="primary" label={continueLabel} onPress={onContinue} />
        </View>
      ) : null}
    </View>
  );
}

/** A full learning session: questions, feedback, summary. Works offline. */
export function SessionRunner({ theme, state, type, reviewOnly, onMood, onClose }: { theme: Theme; state: AppState; type: SessionType; reviewOnly?: boolean; onMood: (m: CharacterMood) => void; onClose: () => void }) {
  const svc = useTutor();
  const [session, setSession] = useState<SessionView | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<(Feedback & { reason?: string }) | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const haptics = state.settings.haptics;
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    void svc.startSession(type, { reviewOnly }).then((s) => {
      setSession(s);
      sessionRef.current = s?.id ?? null;
      onMood(s ? 'thinking' : 'happy');
    });
    // Leaving mid-session keeps answered questions and avoids re-asking the rest soon.
    return () => {
      if (sessionRef.current) void svc.dismissSession(sessionRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (session === undefined) return <Body theme={theme} dim>{t('common.loading')}</Body>;
  if (session === null) {
    return (
      <View style={{ gap: 12 }}>
        <Body theme={theme}>{t('quiz.nothing')}</Body>
        <Button theme={theme} variant="primary" label={t('common.close')} onPress={onClose} />
      </View>
    );
  }

  if (summary) {
    return (
      <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
        <Title theme={theme}>{t('quiz.summary')}</Title>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Body theme={theme}>{t('quiz.summaryScore', { correct: summary.correct, total: summary.answered })}</Body>
          <Tag theme={theme} tone="good" label={t('quiz.xp', { xp: summary.xp })} />
        </View>
        <Body theme={theme} dim small>
          {t('character.level', { level: summary.level.level })} · {summary.level.into}/{summary.level.needed} XP
        </Body>
        <Meter theme={theme} value={summary.level.into} max={summary.level.needed} />
        {summary.dailyGoal > 0 ? (
          <>
            <Body theme={theme} dim small>
              {summary.goalReached ? t('quiz.goal') : t('quiz.goalProgress', { n: summary.questionsToday, goal: summary.dailyGoal })}
            </Body>
            <Meter theme={theme} value={Math.min(summary.questionsToday, summary.dailyGoal)} max={summary.dailyGoal} color={theme.warn} />
          </>
        ) : null}
        {summary.leveledUp ? <Tag theme={theme} tone="warn" label={t('quiz.levelUp', { level: summary.level.level })} /> : null}
        {summary.newUnlocks.map((u) => (
          <Tag key={u} theme={theme} tone="good" label={t('quiz.unlocked', { name: COSMETICS.find((c) => c.id === u)?.name ?? u })} />
        ))}
        {summary.newMilestones.map((m) => (
          <Tag key={m} theme={theme} label={`★ ${MILESTONES.find((x) => x.id === m)?.title ?? m}`} />
        ))}
        <Button theme={theme} variant="primary" label={t('common.done')} onPress={onClose} />
      </View>
    );
  }

  const q = session.questions[index];
  if (!q) return null;
  const last = index + 1 >= session.questions.length;

  const submit = async (response: string | string[], latencyMs: number, meta: AnswerMeta) => {
    setBusy(true);
    try {
      const fb = await svc.answerQuestion(session.id, q.id, response, latencyMs, meta);
      setFeedback(fb);
      setResults((r) => [...r, fb.correct]);
      onMood(fb.mood);
      if (haptics) void Haptics.notificationAsync(fb.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    setFeedback(null);
    if (!last) {
      setIndex(index + 1);
      onMood('thinking');
      return;
    }
    const s = await svc.finishSession(session.id);
    sessionRef.current = null;
    setSummary(s);
    onMood(s.mood);
    for (const m of s.newMilestones) void celebrate(svc, MILESTONES.find((x) => x.id === m)?.title ?? m);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={t('quiz.progress', { n: index + 1, total: session.questions.length })}>
        {session.questions.map((sq, i) => (
          <View key={sq.id} style={{ flex: 1, height: 6, backgroundColor: i < results.length ? (results[i] ? theme.good : theme.bad) : i === index ? theme.warn : theme.surfaceAlt }} />
        ))}
      </View>
      <QuestionView
        theme={theme}
        question={q}
        feedback={feedback}
        busy={busy}
        onSubmit={(r, l, m) => void submit(r, l, m)}
        onContinue={() => void next()}
        continueLabel={last ? t('quiz.finish') : t('quiz.next')}
        showRomaji={state.settings.showRomaji}
        showTranslations={state.settings.showTranslations}
        reason={feedback?.reason}
      />
    </View>
  );
}
