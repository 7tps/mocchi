import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import type { CharacterMood } from '@jc/shared-types';
import { ANIMATIONS } from '@jc/design-system';
import { SPRITE_SHEETS } from '../sprites.generated';

/**
 * Mocchi from the exported sprite sheets (assets/character). Each sheet is a
 * horizontal strip of frames; the view crops to one frame and steps through
 * them on the manifest timing. Exported at 8× so scaling stays crisp.
 */
export function Mocchi({ mood = 'idle', cosmetic = null, size = 128, animate = true }: { mood?: CharacterMood; cosmetic?: string | null; size?: number; animate?: boolean }) {
  const anim = ANIMATIONS[mood];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (!animate) return;
    const id = setInterval(() => setFrame((f) => (anim.loop ? (f + 1) % anim.frames.length : Math.min(f + 1, anim.frames.length - 1))), anim.frameMs);
    return () => clearInterval(id);
  }, [mood, animate, anim]);
  const sheets = SPRITE_SHEETS[mood] ?? SPRITE_SHEETS.idle!;
  const source = (cosmetic && sheets[cosmetic]) || sheets.base;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel={`Mocchi (${mood})`}>
      <Image source={source} style={{ width: size * anim.frames.length, height: size, transform: [{ translateX: -frame * size }] }} resizeMode="stretch" fadeDuration={0} />
    </View>
  );
}
