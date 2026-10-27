import { ScrollView, View } from 'react-native';
import { SKILL_LABELS, t } from '@jc/design-system';
import { useAppState, useLoad } from '../../src/service';
import { useTheme } from '../../src/theme';
import { Body, Meter, Panel, Title } from '../../src/components/ui';

function Stat({ theme, label, value }: { theme: ReturnType<typeof useTheme>; label: string; value: string | number }) {
  return (
    <Panel theme={theme} style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Title theme={theme}>{value}</Title>
      <Body theme={theme} dim small>
        {label}
      </Body>
    </Panel>
  );
}

export default function Progress() {
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const { data } = useLoad((s) => s.getDashboard());
  if (!data) return null;
  const s = data.stats;
  const maxF = Math.max(1, ...s.forecast.map((f) => f.count));
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat theme={theme} label={t('progress.answered')} value={s.questionsAnswered} />
        <Stat theme={theme} label={t('progress.accuracy')} value={pct(s.recentAccuracy)} />
        <Stat theme={theme} label={t('progress.retention')} value={pct(s.retention)} />
        <Stat theme={theme} label={t('progress.time')} value={`${Math.round(s.totalStudyMs / 60000)} min`} />
        <Stat theme={theme} label={t('progress.streak')} value={`${s.streakDays} / ${s.longestStreak}`} />
        <Stat theme={theme} label={t('progress.vocab')} value={s.vocabulary.introduced} />
        <Stat theme={theme} label={t('progress.kanji')} value={s.kanjiReviewed} />
        <Stat theme={theme} label={t('progress.grammar')} value={s.grammarPracticed} />
      </View>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('progress.items')}
        </Title>
        {(['learning', 'reviewing', 'retained'] as const).map((k) => (
          <View key={k} style={{ gap: 4 }}>
            <Body theme={theme} small>
              {t(`progress.${k}`)} · {s.counts[k]}
            </Body>
            <Meter theme={theme} value={s.counts[k]} max={Math.max(1, s.counts.introduced)} />
          </View>
        ))}
        <Body theme={theme} dim small>
          {t('progress.retainedNote')}
        </Body>
      </Panel>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('progress.forecast')}
        </Title>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 }} accessibilityLabel={s.forecast.map((f) => `${f.date}: ${f.count}`).join(', ')}>
          {s.forecast.map((f) => (
            <View key={f.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Body theme={theme} dim small>
                {f.count}
              </Body>
              <View style={{ width: '100%', height: `${(f.count / maxF) * 70}%`, minHeight: 2, backgroundColor: theme.accent }} />
              <Body theme={theme} dim small>
                {f.date.slice(5)}
              </Body>
            </View>
          ))}
        </View>
      </Panel>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('progress.skills')}
        </Title>
        {s.skills
          .filter((k) => k.evidence > 0 || k.ability > 0.5)
          .map((k) => (
            <View key={k.skill} style={{ gap: 4 }}>
              <Body theme={theme} small>
                {SKILL_LABELS[k.skill]} · {k.ability.toFixed(1)}/10
              </Body>
              <Meter theme={theme} value={Math.max(0, k.ability)} max={10} />
            </View>
          ))}
      </Panel>
    </ScrollView>
  );
}
