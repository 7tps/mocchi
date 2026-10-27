import { Pressable, ScrollView, Text, View } from 'react-native';
import { COSMETICS, MILESTONES } from '@jc/learning-engine';
import { habitLine, t } from '@jc/design-system';
import { useAppState, useTutor } from '../src/service';
import { useTheme, FONT_DISPLAY } from '../src/theme';
import { Mocchi } from '../src/components/Mocchi';
import { Body, Meter, Panel, Tag, Title } from '../src/components/ui';

export default function CharacterScreen() {
  const svc = useTutor();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  if (!state) return null;
  const c = state.character;
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Panel theme={theme} style={{ alignItems: 'center', gap: 8 }}>
        <Mocchi mood={state.habit.mood} cosmetic={c.selectedCosmetic} size={160} animate={animate} />
        <Body theme={theme} small style={{ textAlign: 'center' }}>
          {habitLine(state.habit)}
        </Body>
        <Title theme={theme}>{t('character.level', { level: state.level.level })}</Title>
        <View style={{ alignSelf: 'stretch' }}>
          <Meter theme={theme} value={state.level.into} max={state.level.needed} />
        </View>
        <Body theme={theme} dim small>
          {t('character.xpToNext', { n: state.level.needed - state.level.into })}
        </Body>
        <Body theme={theme} dim small style={{ textAlign: 'center' }}>
          {t('character.note')}
        </Body>
      </Panel>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('character.cosmetics')}
        </Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[null, ...COSMETICS.map((x) => x.id)].map((id) => {
            const def = COSMETICS.find((x) => x.id === id);
            const unlocked = id === null || c.unlocked.includes(id);
            return (
              <Pressable
                key={id ?? 'none'}
                accessibilityRole="button"
                accessibilityState={{ disabled: !unlocked, selected: c.selectedCosmetic === id }}
                accessibilityLabel={def ? `${def.name}${unlocked ? '' : `, locked: ${def.description}`}` : t('character.none')}
                disabled={!unlocked}
                onPress={() => void svc.selectCosmetic(id)}
                style={{ width: 96, alignItems: 'center', padding: 6, borderWidth: 2, borderColor: c.selectedCosmetic === id ? theme.accent : theme.border, opacity: unlocked ? 1 : 0.45 }}
              >
                <Mocchi mood="idle" cosmetic={id} size={64} animate={false} />
                <Text style={{ color: theme.text, fontSize: 12, fontFamily: FONT_DISPLAY, textAlign: 'center' }}>{def?.name ?? t('character.none')}</Text>
              </Pressable>
            );
          })}
        </View>
      </Panel>
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('character.milestones')}
        </Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {MILESTONES.map((m) => (
            <Tag key={m.id} theme={theme} tone={c.milestones.includes(m.id) ? 'good' : undefined} label={`${c.milestones.includes(m.id) ? '★' : '☆'} ${m.title}`} />
          ))}
        </View>
      </Panel>
    </ScrollView>
  );
}
