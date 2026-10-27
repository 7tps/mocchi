import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SKILL_LABELS, habitLine, levelLabel, lineFor, t } from '@jc/design-system';
import { jlptProgress, restingMood } from '@jc/learning-engine';
import { useAppState, useLoad, useTutor } from '../../src/service';
import { useTheme } from '../../src/theme';
import { Mocchi } from '../../src/components/Mocchi';
import { Body, Button, Meter, Panel, Tag, Title } from '../../src/components/ui';

export default function Home() {
  const svc = useTutor();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const { data } = useLoad((s) => s.getDashboard());
  if (!state || !data) return null;
  const s = data.stats;
  const goal = state.settings.dailyGoalQuestions;
  const paused = state.pause.indefinite || state.pause.until !== null;
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Panel theme={theme} style={{ alignItems: 'center', gap: 10 }}>
        <Mocchi mood={restingMood(state.habit, { paused, due: s.dueNow })} cosmetic={state.character.selectedCosmetic} size={128} animate={animate} />
        <Body theme={theme} ja>
          {lineFor('greet', s.questionsAnswered).ja}
        </Body>
        <Body theme={theme} small style={{ textAlign: 'center' }}>
          {habitLine(state.habit)}
        </Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          <Tag theme={theme} label={t('home.streak', { n: s.streakDays })} />
          <Tag theme={theme} label={`${t('home.level')} ${data.level.level}`} />
          <Tag theme={theme} label={`≈ ${data.band}`} />
          {paused ? <Tag theme={theme} tone="warn" label={t('home.paused')} /> : null}
        </View>
        <View style={{ alignSelf: 'stretch', gap: 4 }}>
          <Body theme={theme} dim small>
            {t('quiz.goalProgress', { n: s.questionsToday, goal })}
          </Body>
          <Meter theme={theme} value={Math.min(s.questionsToday, goal)} max={goal || 1} color={theme.warn} />
        </View>
        <Button theme={theme} variant="primary" label={t('home.start')} onPress={() => router.push({ pathname: '/session', params: { source: 'manual' } })} style={{ alignSelf: 'stretch' }} />
        <Button theme={theme} label={`${t('home.review')} · ${t('home.due', { n: s.dueNow })}`} disabled={s.dueNow === 0} onPress={() => router.push({ pathname: '/session', params: { source: 'review' } })} style={{ alignSelf: 'stretch' }} />
        {paused ? <Button theme={theme} variant="ghost" label={t('home.resume')} onPress={() => void svc.resume()} /> : null}
      </Panel>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Panel theme={theme} style={{ flex: 1 }}>
          <Title theme={theme}>{s.dueNow}</Title>
          <Body theme={theme} dim small>
            Due now
          </Body>
        </Panel>
        <Panel theme={theme} style={{ flex: 1 }}>
          <Title theme={theme}>{s.vocabulary.introduced}</Title>
          <Body theme={theme} dim small>
            {t('progress.vocab')}
          </Body>
        </Panel>
        <Panel theme={theme} style={{ flex: 1 }}>
          <Title theme={theme}>{data.overallAbility.toFixed(1)}</Title>
          <Body theme={theme} dim small>
            Level /10
          </Body>
        </Panel>
      </View>

      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('home.recent')}
        </Title>
        {data.recent.length === 0 ? (
          <Body theme={theme} dim>
            {t('home.empty')}
          </Body>
        ) : (
          data.recent.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
              <Body theme={theme} style={{ fontSize: 20, minWidth: 72 }} ja>
                {r.ja}
              </Body>
              <Body theme={theme} small style={{ flex: 1 }}>
                {r.reading && r.reading !== r.ja ? `${r.reading} · ` : ''}
                {r.meaning}
              </Body>
              <Tag theme={theme} label={r.status} tone={r.status === 'retained' ? 'good' : r.status === 'learning' ? 'warn' : undefined} />
            </View>
          ))
        )}
      </Panel>

      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('home.weakest')}
        </Title>
        {data.weakest.map((sk) => {
          const est = s.skills.find((x) => x.skill === sk);
          const p = jlptProgress(est?.ability ?? 0, sk);
          return (
            <View key={sk} style={{ gap: 4 }}>
              <Body theme={theme} small>
                {SKILL_LABELS[sk]} · {levelLabel(p)}
              </Body>
              <Meter theme={theme} value={p.percent} max={100} />
            </View>
          );
        })}
      </Panel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button theme={theme} label={t('nav.review')} onPress={() => router.push('/review')} style={{ flex: 1 }} />
        <Button theme={theme} label={t('nav.character')} onPress={() => router.push('/character')} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}
