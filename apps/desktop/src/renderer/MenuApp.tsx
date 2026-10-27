import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { t } from '@jc/design-system';
import { api, desktop } from './bridge';
import { useAppState } from './hooks';
import { PixelIcon } from './components/ui';

/**
 * The character's right-click menu, in the app's own style. It lives in its own
 * small window (the character window is too small to hold it); main sizes the
 * window to this content and closes it when it loses focus.
 */
export function MenuApp() {
  const { state } = useAppState();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('transparent');
  }, []);

  // Report the rendered size (again when fonts or state change it).
  const loaded = state !== null;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // + the 4px pixel shadow (the .ctx-menu margin), so it isn't clipped by the window.
    const report = () => void desktop.menuReady({ width: el.offsetWidth + 4, height: el.offsetHeight + 4 });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded]);

  // Keyboard: arrows move between items, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void desktop.closeMenu();
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!state) return null;
  const paused = state.pause.indefinite || state.pause.until !== null;
  const run = (fn: () => Promise<unknown>) => () => {
    void fn().finally(() => void desktop.closeMenu());
  };

  return (
    <div ref={ref} className="ctx-menu" role="menu" aria-label="Mocchi">
      <Item icon="play" disabled={!state.onboarded} onClick={run(() => desktop.openQuiz('manual'))} autoFocus>
        {t('tray.start')}
      </Item>
      <Item icon="home" onClick={run(() => desktop.openMain())}>
        {t('tray.open')}
      </Item>
      <hr />
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={state.settings.characterVisible}
        className="ctx-item"
        onClick={run(() => api.updateSettings({ characterVisible: !state.settings.characterVisible }))}
      >
        <span className="ctx-check" aria-hidden>
          {state.settings.characterVisible ? '✓' : ''}
        </span>
        {t('tray.showCharacter')}
      </button>
      {paused ? (
        <Item icon="play" onClick={run(() => api.resume())}>
          {t('tray.resume')}
        </Item>
      ) : (
        <>
          <div className="ctx-label" role="presentation">
            <PixelIcon name="clock" size={14} />
            {t('tray.pause')}
          </div>
          <Item indent onClick={run(() => api.pause('1h'))}>
            {t('settings.pause1h')}
          </Item>
          <Item indent onClick={run(() => api.pause('tomorrow'))}>
            {t('settings.pauseTomorrow')}
          </Item>
          <Item indent onClick={run(() => api.pause('indefinite'))}>
            {t('settings.pauseForever')}
          </Item>
        </>
      )}
      <hr />
      <Item icon="settings" onClick={run(() => desktop.openMain('main/settings'))}>
        {t('nav.settings')}
      </Item>
      <Item icon="close" danger onClick={run(() => desktop.quit())}>
        {t('tray.quit')}
      </Item>
    </div>
  );
}

function Item({
  icon,
  indent,
  danger,
  disabled,
  autoFocus,
  onClick,
  children,
}: {
  icon?: string;
  indent?: boolean;
  danger?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`ctx-item${indent ? ' indent' : ''}${danger ? ' danger' : ''}`}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={onClick}
    >
      {icon ? <PixelIcon name={icon} size={14} /> : <span className="ctx-check" aria-hidden />}
      {children}
    </button>
  );
}
