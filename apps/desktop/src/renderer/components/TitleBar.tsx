import { useEffect, useState } from 'react';
import { t } from '@jc/design-system';
import { desktop } from '../bridge';
import { useLoad } from '../hooks';
import { Mocchi } from './Mocchi';
import { PixelIcon } from './ui';

/**
 * The main window's title bar, drawn by the app so it follows the theme. The bar
 * itself is a drag region (move, double-click to maximise, Windows snap); the
 * buttons are not. On macOS the native traffic lights sit at the left instead.
 */
export function TitleBar() {
  const { data: info } = useLoad(() => desktop.info(), [], false);
  const [maximized, setMaximized] = useState(false);
  const [focused, setFocused] = useState(() => document.hasFocus());

  useEffect(() => {
    void desktop.windowState().then((s) => setMaximized(s.maximized));
    return desktop.onWindowState((s) => setMaximized(s.maximized));
  }, []);

  useEffect(() => {
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    window.addEventListener('focus', on);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('focus', on);
      window.removeEventListener('blur', off);
    };
  }, []);

  const mac = info?.platform === 'darwin';
  return (
    <header className={`titlebar${focused ? '' : ' inactive'}${mac ? ' mac' : ''}`}>
      <div className="titlebar-title">
        {/* Full size: scaling the 32px sprite below 1× drops pixels (the eyes vanish). */}
        <Mocchi mood="idle" scale={1} animate={false} />
        <span className="display">{t('app.name')}</span>
        <span className="titlebar-sub">{t('window.subtitle')}</span>
      </div>
      {info && !mac ? (
        <div className="titlebar-buttons">
          <button type="button" aria-label={t('window.minimize')} title={t('window.minimize')} onClick={() => void desktop.windowControl('minimize')}>
            <PixelIcon name="minimize" size={10} />
          </button>
          <button
            type="button"
            aria-label={maximized ? t('window.restore') : t('window.maximize')}
            title={maximized ? t('window.restore') : t('window.maximize')}
            onClick={() => void desktop.windowControl('toggle-maximize')}
          >
            <PixelIcon name={maximized ? 'restore' : 'maximize'} size={10} />
          </button>
          <button type="button" className="close" aria-label={t('window.close')} title={t('window.close')} onClick={() => void desktop.windowControl('close')}>
            <PixelIcon name="close" size={10} />
          </button>
        </div>
      ) : null}
    </header>
  );
}
