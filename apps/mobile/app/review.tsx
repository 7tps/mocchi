import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { t } from '@jc/design-system';
import { useAppState, useLoad } from '../src/service';
import { useTheme } from '../src/theme';
import { Body, Button } from '../src/components/ui';
import { EntryRow } from '../src/components/EntryRow';

export default function ReviewQueue() {
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const { data } = useLoad((s) => s.getReviewQueue());
  const dueNow = (data ?? []).filter((e) => (e.nextReviewAt ?? Infinity) <= Date.now()).length;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Body theme={theme} dim>
          Due now and within the next 24 hours, soonest first.
        </Body>
        <Button theme={theme} variant="primary" label={`${t('home.review')} · ${t('home.due', { n: dueNow })}`} disabled={dueNow === 0} onPress={() => router.push({ pathname: '/session', params: { source: 'review' } })} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EntryRow theme={theme} e={item} />}
        ListEmptyComponent={
          <Body theme={theme} dim style={{ padding: 16 }}>
            {t('quiz.nothing')}
          </Body>
        }
      />
    </View>
  );
}
