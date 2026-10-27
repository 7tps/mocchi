import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { Theme } from '@jc/design-system';
import { FONT_DISPLAY } from '../theme';

export function Panel({ theme, children, style }: { theme: Theme; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }, style]}>{children}</View>;
}

export function Title({ theme, children, size = 22, style }: { theme: Theme; children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: FONT_DISPLAY, fontSize: size, color: theme.text }, style]}>{children}</Text>;
}

export function Body({ theme, children, dim, small, style, ja }: { theme: Theme; children: ReactNode; dim?: boolean; small?: boolean; style?: StyleProp<TextStyle>; ja?: boolean }) {
  return (
    <Text style={[{ color: dim ? theme.textDim : theme.text, fontSize: small ? 13 : 15, lineHeight: small ? 18 : 22 }, ja ? { letterSpacing: 0.5 } : null, style]} lang={ja ? 'ja' : undefined}>
      {children}
    </Text>
  );
}

export function Button({
  theme,
  label,
  onPress,
  variant = 'default',
  disabled,
  accessibilityLabel,
  style,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? theme.accent : variant === 'ghost' ? 'transparent' : theme.surfaceAlt;
  const fg = variant === 'primary' ? theme.accentText : variant === 'danger' ? theme.bad : theme.text;
  const border = variant === 'primary' ? theme.accent : variant === 'danger' ? theme.bad : variant === 'ghost' ? 'transparent' : theme.borderStrong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1, transform: [{ translateY: pressed ? 2 : 0 }] },
        variant !== 'ghost' ? { borderBottomWidth: pressed ? 2 : 5 } : null,
        style,
      ]}
    >
      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Meter({ theme, value, max, color }: { theme: Theme; value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ height: 12, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.bg }}
    >
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? theme.accent }} />
    </View>
  );
}

export function ToggleRow({ theme, label, value, onChange, hint }: { theme: Theme; label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Body theme={theme}>{label}</Body>
        {hint ? (
          <Body theme={theme} dim small>
            {hint}
          </Body>
        ) : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.border }} thumbColor={theme.text} />
    </View>
  );
}

export function StepperRow({ theme, label, value, min, max, step = 1, onChange, format }: { theme: Theme; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <View style={styles.row}>
      <Body theme={theme} style={{ flex: 1 }}>
        {label}
      </Body>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: theme.borderStrong }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} disabled={value <= min} onPress={() => onChange(Math.max(min, value - step))} style={styles.step}>
          <Text style={{ color: theme.text, fontSize: 18 }}>−</Text>
        </Pressable>
        <Text style={{ fontFamily: FONT_DISPLAY, color: theme.text, minWidth: 52, textAlign: 'center' }}>{format ? format(value) : value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} style={styles.step}>
          <Text style={{ color: theme.text, fontSize: 18 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Tag({ theme, label, tone }: { theme: Theme; label: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? theme.good : tone === 'warn' ? theme.warn : tone === 'bad' ? theme.bad : theme.textDim;
  return (
    <View style={{ borderWidth: 2, borderColor: tone ? color : theme.border, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 12, color }}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  panel: { borderWidth: 2, padding: 16, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 0 },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, minHeight: 48 },
  step: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
});
