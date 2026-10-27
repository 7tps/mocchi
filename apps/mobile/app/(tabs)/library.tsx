import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import type { LibraryFilter } from '@jc/app-core';
import { t } from '@jc/design-system';
import { useAppState, useLoad } from '../../src/service';
import { useTheme, FONT_DISPLAY } from '../../src/theme';
import { Body } from '../../src/components/ui';
import { EntryRow } from '../../src/components/EntryRow';

const TYPES: Array<{ key: NonNullable<LibraryFilter['type']>; label: string }> = [
  { key: 'vocab', label: t('library.vocab') },
  { key: 'kanji', label: t('library.kanji') },
  { key: 'grammar', label: t('library.grammar') },
  { key: 'kana', label: t('library.kana') },
  { key: 'expression', label: t('library.expression') },
];

export default function Library() {
  const state = useAppState();
  const theme = useTheme(state?.settings.theme);
  const [type, setType] = useState<NonNullable<LibraryFilter['type']>>('vocab');
  const [search, setSearch] = useState('');
  const { data } = useLoad((s) => s.getLibrary({ type, search, limit: 500 }), [type, search]);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 10 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('library.search')}
          placeholderTextColor={theme.textFaint}
          accessibilityLabel={t('library.search')}
          style={{ borderWidth: 2, borderColor: theme.borderStrong, color: theme.text, backgroundColor: theme.surface, padding: 10, minHeight: 48 }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TYPES.map((ty) => (
            <Pressable
              key={ty.key}
              accessibilityRole="button"
              accessibilityState={{ selected: type === ty.key }}
              onPress={() => setType(ty.key)}
              style={{ borderWidth: 2, borderColor: type === ty.key ? theme.accent : theme.border, paddingHorizontal: 10, paddingVertical: 6, minHeight: 36 }}
            >
              <Text style={{ fontFamily: FONT_DISPLAY, color: theme.text }}>{ty.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EntryRow theme={theme} e={item} />}
        ListEmptyComponent={
          <Body theme={theme} dim style={{ padding: 16 }}>
            {data ? t('library.empty') : t('common.loading')}
          </Body>
        }
        initialNumToRender={20}
      />
    </View>
  );
}
