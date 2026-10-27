import { useEffect, useRef, useState } from 'react';
import type { CharacterMood } from '@jc/shared-types';
import { ANIMATIONS, SPRITE_SIZE, frameToRgba, renderFrame } from '@jc/design-system';

const cache = new Map<string, ImageData>();

function frameImage(mood: CharacterMood, i: number, cosmetic: string | null): ImageData {
  const key = `${mood}|${cosmetic ?? ''}|${i}`;
  let img = cache.get(key);
  if (!img) {
    img = new ImageData(frameToRgba(renderFrame(mood, i, cosmetic)), SPRITE_SIZE, SPRITE_SIZE);
    cache.set(key, img);
  }
  return img;
}

interface Props {
  mood?: CharacterMood;
  cosmetic?: string | null;
  /** CSS pixels per sprite pixel. */
  scale?: number;
  animate?: boolean;
  label?: string;
}

/**
 * The pixel-art companion, drawn at native 32×32 and scaled with
 * nearest-neighbour so it stays crisp on any display density.
 */
export function Mocchi({ mood = 'idle', cosmetic = null, scale = 3, animate = true, label = 'Mocchi' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [blinking, setBlinking] = useState(false);
  const shown: CharacterMood = blinking && mood === 'idle' ? 'blink' : mood;

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const anim = ANIMATIONS[shown];
    let i = 0;
    g.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    g.putImageData(frameImage(shown, 0, cosmetic), 0, 0);
    if (!animate) return;
    const id = setInterval(() => {
      i++;
      if (!anim.loop && i >= anim.frames.length) {
        clearInterval(id);
        setBlinking(false);
        return;
      }
      g.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      g.putImageData(frameImage(shown, i % anim.frames.length, cosmetic), 0, 0);
    }, anim.frameMs);
    return () => clearInterval(id);
  }, [shown, cosmetic, animate]);

  // Occasional blink while idle.
  useEffect(() => {
    if (!animate || mood !== 'idle') return;
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setBlinking(true);
        schedule();
      }, 2800 + Math.random() * 3500);
    };
    schedule();
    return () => clearTimeout(t);
  }, [mood, animate]);

  return (
    <canvas
      ref={ref}
      className="sprite"
      width={SPRITE_SIZE}
      height={SPRITE_SIZE}
      style={{ width: SPRITE_SIZE * scale, height: SPRITE_SIZE * scale }}
      role="img"
      aria-label={`${label} (${mood})`}
    />
  );
}
