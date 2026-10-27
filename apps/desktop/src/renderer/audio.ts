/**
 * Tiny synthesized sound effects (no audio files to ship or go missing) and
 * Japanese text-to-speech via the OS voices, when one is installed.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', gain = 0.04): void {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

export type Sfx = 'correct' | 'wrong' | 'prompt' | 'complete';

export function playSfx(kind: Sfx): void {
  switch (kind) {
    case 'correct':
      tone(784, 0, 0.08);
      tone(1175, 0.08, 0.12);
      break;
    case 'wrong':
      tone(330, 0, 0.12, 'triangle', 0.05);
      tone(262, 0.1, 0.16, 'triangle', 0.05);
      break;
    case 'prompt':
      tone(988, 0, 0.1, 'sine', 0.05);
      tone(1319, 0.12, 0.18, 'sine', 0.04);
      break;
    case 'complete':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.12));
      break;
  }
}

function japaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ja')) ?? null;
}

/** Resolves once voices have loaded (they arrive asynchronously in Chromium). */
export function detectJapaneseVoice(timeoutMs = 2500): Promise<boolean> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve(false);
  if (japaneseVoice()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = () => resolve(!!japaneseVoice());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

export function speak(text: string): boolean {
  const voice = japaneseVoice();
  if (!voice) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  speechSynthesis.speak(u);
  return true;
}
