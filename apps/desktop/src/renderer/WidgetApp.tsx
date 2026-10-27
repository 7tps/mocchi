import { useEffect, useRef, useState } from 'react';
import type { CharacterMood } from '@jc/shared-types';
import { lineFor, t } from '@jc/design-system';
import { inQuietHours } from '@jc/learning-engine';
import { api, desktop, onChanged } from './bridge';
import { useAppState } from './hooks';
import { Mocchi } from './components/Mocchi';
import { playSfx } from './audio';

/** The small always-on-top character. Click: quiz. Drag: move. Right-click: menu. Double-click: open app. */
export function WidgetApp() {
  const { state } = useAppState();
  const [due, setDue] = useState(0);
  const [mood, setMood] = useState<CharacterMood>('idle');
  const [bubble, setBubble] = useState<string | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastClick = useRef(0);

  useEffect(() => {
    document.body.classList.add('transparent');
  }, []);

  const flash = (m: CharacterMood, ms: number, text?: string) => {
    setMood(m);
    setBubble(text ?? null);
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => {
      setMood('idle');
      setBubble(null);
    }, ms);
  };

  useEffect(() => {
    const refreshDue = () =>
      api
        .getReviewQueue()
        .then((q) => setDue(q.filter((e) => (e.nextReviewAt ?? Infinity) <= Date.now()).length))
        .catch(() => undefined);
    refreshDue();
    const id = setInterval(refreshDue, 60_000);
    const off = onChanged((reason) => {
      refreshDue();
      if (reason === 'session') flash('happy', 3500, lineFor('done', Date.now()).ja);
    });
    return () => {
      clearInterval(id);
      off();
    };
  }, []);

  useEffect(
    () =>
      desktop.onPrompt(() => {
        const line = lineFor('prompt', Date.now());
        flash('curious', 9000, line.ja);
        if (state?.settings.soundEffects) playSfx('prompt');
      }),
    [state?.settings.soundEffects],
  );

  if (!state) return null;
  const paused = state.pause.indefinite || state.pause.until !== null;
  const quiet = inQuietHours(state.settings.quietHours, Date.now(), state.timeZone);
  const shownMood: CharacterMood = mood !== 'idle' ? mood : paused || quiet ? 'sleepy' : due > 0 ? 'waiting' : 'idle';
  const animate = state.settings.characterAnimation && !state.settings.reducedMotion;

  return (
    <div
      className="widget"
      role="button"
      tabIndex={0}
      aria-label={`${t('app.name')}: ${due > 0 ? t('home.due', { n: due }) : t('tray.start')}`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        // Capture so the release is seen even if the cursor outruns the window; otherwise it would keep following the mouse.
        e.currentTarget.setPointerCapture(e.pointerId);
        void desktop.widgetDragStart();
      }}
      onPointerCancel={() => void desktop.widgetDragEnd()}
      onPointerUp={async (e) => {
        if (e.button !== 0) return;
        const isClick = await desktop.widgetDragEnd();
        if (!isClick) return;
        const now = Date.now();
        if (now - lastClick.current < 350) {
          void desktop.openMain();
          lastClick.current = 0;
          return;
        }
        lastClick.current = now;
        setTimeout(() => {
          if (lastClick.current !== now) return;
          if (state?.onboarded) void desktop.openQuiz('manual');
          else if (state?.placementInProgress) void desktop.openPlacement();
          else void desktop.openMain();
        }, 360);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        void desktop.widgetMenu();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') void desktop.openQuiz('manual');
      }}
    >
      {bubble ? (
        <div className="bubble jp" lang="ja">
          {bubble}
        </div>
      ) : null}
      {due > 0 ? (
        <div className="badge" title={t('home.due', { n: due })}>
          {due > 99 ? '99+' : due}
        </div>
      ) : null}
      <Mocchi mood={shownMood} cosmetic={state.character.selectedCosmetic} scale={3} animate={animate} />
    </div>
  );
}
