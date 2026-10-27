import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Feedback, PlacementView } from '@jc/app-core';
import type { AnswerMeta, CharacterMood, ExperienceLevel, PlacementResult } from '@jc/shared-types';
import { SKILL_LABELS, levelLabel, t, type Theme } from '@jc/design-system';
import { jlptProgress } from '@jc/learning-engine';
import { useTutor } from '../service';
import { QuestionView } from './Quiz';
import { Body, Button, Meter, Tag, Title } from './ui';

export function PlacementResultView({ theme, result }: { theme: Theme; result: PlacementResult }) {
  return (
    <View style={{ gap: 10 }}>
      <Body theme={theme} dim small>
        {t('onboard.results.band')}
      </Body>
      <Title theme={theme} size={30}>
        {result.band === 'pre-N5' ? 'Pre-N5' : `${result.bandConfident ? '' : '≈ '}${result.band}`}
      </Title>
      <Body theme={theme} dim small>
        {t('onboard.results.approx')}
      </Body>
      <Body theme={theme} small>
        {t('level.overall')}: {levelLabel(jlptProgress(result.overallAbility))}
      </Body>
      {result.categories.map((c) => (
        <View key={c.skill} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Body theme={theme} small>
              {SKILL_LABELS[c.skill]}
            </Body>
            <Body theme={theme} small dim>
              {levelLabel(jlptProgress(c.ability, c.skill))} · {t('onboard.results.correct', { correct: c.correct, asked: c.asked })}
            </Body>
          </View>
          <Meter theme={theme} value={jlptProgress(c.ability, c.skill).percent} max={100} />
          {c.kanjiBlocked ? (
            <Body theme={theme} dim small>
              {t('onboard.results.kanjiBlocked')}
            </Body>
          ) : null}
        </View>
      ))}
      {result.strengths.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {result.strengths.map((s) => (
            <Tag key={s} theme={theme} tone="good" label={SKILL_LABELS[s]} />
          ))}
        </View>
      ) : null}
      {result.weaknesses.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {result.weaknesses.map((s) => (
            <Tag key={s} theme={theme} tone="warn" label={SKILL_LABELS[s]} />
          ))}
        </View>
      ) : null}
      {result.unknownKana.length ? (
        <Body theme={theme} small>
          {t('onboard.results.kana')}: {result.unknownKana.slice(0, 12).join(' ')}
          {result.unknownKana.length > 12 ? ' …' : ''}
        </Body>
      ) : null}
      <Body theme={theme} small>
        {t('onboard.results.adapt')}
      </Body>
    </View>
  );
}

export function PlacementRunner({ theme, experience, resume, onDone, onMood }: { theme: Theme; experience: ExperienceLevel; resume: boolean; onDone: (r: PlacementResult) => void; onMood: (m: CharacterMood) => void }) {
  const svc = useTutor();
  const [view, setView] = useState<PlacementView | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void (resume ? svc.resumePlacement() : Promise.resolve(null)).then(async (v) => setView(v ?? (await svc.beginPlacement(experience))));
    // Start once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!view?.question) return <Body theme={theme} dim>{t('common.loading')}</Body>;
  const answer = async (r: string | string[] | null, l?: number, meta: AnswerMeta = {}) => {
    setBusy(true);
    const fb = await svc.answerPlacement(r, l, meta);
    setFeedback(fb);
    onMood(fb.mood);
    setBusy(false);
  };
  const next = async () => {
    setFeedback(null);
    const v = await svc.nextPlacement();
    if (v.finished || !v.question) onDone(await svc.finishPlacement());
    else {
      setView(v);
      onMood('thinking');
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body theme={theme} dim small>
          {t('onboard.exam.progress', { n: view.answered + 1, total: view.estimatedTotal })}
        </Body>
        <Tag theme={theme} label={SKILL_LABELS[view.question.placementSkill]} />
      </View>
      <Meter theme={theme} value={view.answered} max={view.estimatedTotal} />
      <QuestionView
        theme={theme}
        question={view.question}
        feedback={feedback}
        busy={busy}
        onSubmit={(r, l, m) => void answer(r, l, m)}
        onCantReadKanji={() => void answer(null, undefined, { cantReadKanji: true })}
        onContinue={() => void next()}
        continueLabel={t('quiz.next')}
        showRomaji={false}
        showTranslations
        extra={<Button theme={theme} variant="ghost" label={t('onboard.exam.dontKnow')} onPress={() => void answer(null)} disabled={busy} />}
      />
    </View>
  );
}
