import { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { CharacterMood, PlacementResult } from '@jc/shared-types';
import { relativeTime, t } from '@jc/design-system';
import { useAppState, useLoad, useTutor } from '../src/service';
import { useTheme } from '../src/theme';
import { PlacementResultView, PlacementRunner } from '../src/components/Placement';
import { Body, Button, Panel, Tag, Title } from '../src/components/ui';

export default function Account() {
  const svc = useTutor();
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const { data: status, reload } = useLoad((s) => s.getSyncStatus());
  const [server, setServer] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retake, setRetake] = useState<'idle' | 'exam' | PlacementResult>('idle');
  const [, setMood] = useState<CharacterMood>('thinking');
  if (!state) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      reload();
    }
  };

  const exportData = () =>
    run(async () => {
      const file = new File(Paths.cache, `mocchi-export-${new Date().toISOString().slice(0, 10)}.json`);
      file.write(await svc.exportData());
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('settings.sync')}
        </Title>
        <TextInput
          defaultValue={state.settings.syncServerUrl}
          onChangeText={setServer}
          onBlur={() => server !== null && void svc.updateSettings({ syncServerUrl: server.trim() })}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('settings.syncServer')}
          style={{ borderWidth: 2, borderColor: theme.borderStrong, color: theme.text, padding: 10, minHeight: 48 }}
        />
        {status?.linked ? (
          <>
            <Body theme={theme} small>
              {status.lastSyncAt ? t('settings.syncLast', { when: relativeTime(status.lastSyncAt, Date.now()) }) : t('settings.syncNever')}
              {status.pending ? ` · ${t('settings.syncPending', { n: status.pending })}` : ''}
            </Body>
            {status.lastError ? <Tag theme={theme} tone="bad" label={status.lastError} /> : null}
            <Button theme={theme} variant="primary" label={t('settings.syncNow')} disabled={busy} onPress={() => void run(() => svc.syncNow())} />
            <Button theme={theme} label={t('settings.syncLinkCode')} disabled={busy} onPress={() => void run(async () => setShownCode((await svc.getLinkCode()).code))} />
            {shownCode ? <Title theme={theme} size={28}>{shownCode}</Title> : null}
            <Button theme={theme} variant="ghost" label={t('settings.syncUnlink')} disabled={busy} onPress={() => void run(() => svc.unlinkAccount())} />
            <Button
              theme={theme}
              variant="danger"
              label={t('settings.syncDelete')}
              disabled={busy}
              onPress={() =>
                Alert.alert(t('settings.syncDelete'), 'All learning data stored on the sync server will be deleted. Data on this phone is kept.', [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => void run(() => svc.deleteAccount()) },
                ])
              }
            />
          </>
        ) : (
          <>
            <Body theme={theme} dim small>
              {t('settings.syncOff')}
            </Body>
            <Button theme={theme} variant="primary" label={t('settings.syncCreate')} disabled={busy} onPress={() => void run(() => svc.createAccount())} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholder="ABCD2345"
                placeholderTextColor={theme.textFaint}
                accessibilityLabel={t('settings.syncEnterCode')}
                style={{ flex: 1, borderWidth: 2, borderColor: theme.borderStrong, color: theme.text, padding: 10, minHeight: 48 }}
              />
              <Button theme={theme} label={t('settings.syncLink')} disabled={busy || code.trim().length < 6} onPress={() => void run(() => svc.linkWithCode(code))} />
            </View>
          </>
        )}
        {error ? <Tag theme={theme} tone="bad" label={error} /> : null}
      </Panel>

      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('settings.placement')}
        </Title>
        {retake === 'idle' ? (
          <Button theme={theme} label={t('common.start')} onPress={() => setRetake('exam')} />
        ) : retake === 'exam' ? (
          <PlacementRunner theme={theme} experience={state.profile?.experience ?? 'beginner'} resume={state.placementInProgress} onMood={setMood} onDone={(r) => setRetake(r)} />
        ) : (
          <>
            <PlacementResultView theme={theme} result={retake} />
            <Button theme={theme} label={t('common.done')} onPress={() => setRetake('idle')} />
          </>
        )}
      </Panel>

      <Panel theme={theme} style={{ gap: 8 }}>
        <Title theme={theme} size={18}>
          {t('about.privacy')}
        </Title>
        <Body theme={theme} small>
          {t('about.privacyBody')}
        </Body>
        <Button theme={theme} label={t('about.export')} disabled={busy} onPress={() => void exportData()} />
        <Button
          theme={theme}
          variant="danger"
          label={t('about.clear')}
          onPress={() =>
            Alert.alert(t('about.clear'), 'This permanently deletes all progress on this phone.', [
              { text: t('common.cancel'), style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void svc.clearAllData() },
            ])
          }
        />
        <Body theme={theme} dim small>
          {t('about.contentBody')}
        </Body>
      </Panel>
    </ScrollView>
  );
}
