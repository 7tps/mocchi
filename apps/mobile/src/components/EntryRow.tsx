import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LibraryEntry } from '@jc/app-core';
import type { Theme } from '@jc/design-system';
import { Body, Tag } from './ui';

export function EntryRow({ theme, e }: { theme: Theme; e: LibraryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={{ borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 10, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, minWidth: 76 }}>{e.ja}</Text>
        <View style={{ flex: 1 }}>
          {e.reading && e.reading !== e.ja ? <Text style={{ color: theme.textDim }}>{e.reading}</Text> : null}
          <Text style={{ color: theme.text, fontSize: 13 }}>{e.meaning}</Text>
        </View>
        <Tag theme={theme} label={e.status} tone={e.status === 'retained' ? 'good' : e.status === 'learning' || e.status === 'relearning' ? 'warn' : undefined} />
      </View>
      {open ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          {e.notes ? (
            <Body theme={theme} small>
              {e.notes}
            </Body>
          ) : null}
          {e.examples.map((x) => (
            <View key={x.ja} style={{ borderLeftWidth: 3, borderLeftColor: theme.borderStrong, paddingLeft: 8 }}>
              <Text style={{ color: theme.text }}>{x.ja}</Text>
              <Text style={{ color: theme.textDim, fontSize: 12 }}>{x.reading}</Text>
              <Text style={{ color: theme.textFaint, fontSize: 12 }}>{x.en}</Text>
            </View>
          ))}
          <Body theme={theme} dim small>
            {e.attempts} attempts{e.accuracy !== null ? ` · ${Math.round(e.accuracy * 100)}%` : ''}
          </Body>
        </View>
      ) : null}
    </Pressable>
  );
}
