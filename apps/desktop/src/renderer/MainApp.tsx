import { useEffect, useState } from 'react';
import { t, type StringKey } from '@jc/design-system';
import { desktop, isElectron } from './bridge';
import { useAppState } from './hooks';
import { detectJapaneseVoice } from './audio';
import { Mocchi } from './components/Mocchi';
import { PixelIcon } from './components/ui';
import { Onboarding } from './screens/Onboarding';
import { Home, Learn } from './screens/Home';
import { Library, Progress } from './screens/Progress';
import { About, CharacterScreen, Settings } from './screens/Settings';

const NAV: Array<{ route: string; icon: string; label: StringKey }> = [
  { route: 'home', icon: 'home', label: 'nav.home' },
  { route: 'learn', icon: 'learn', label: 'nav.learn' },
  { route: 'progress', icon: 'progress', label: 'nav.progress' },
  { route: 'library', icon: 'library', label: 'nav.library' },
  { route: 'review', icon: 'review', label: 'nav.review' },
  { route: 'character', icon: 'character', label: 'nav.character' },
  { route: 'settings', icon: 'settings', label: 'nav.settings' },
  { route: 'about', icon: 'about', label: 'nav.about' },
];

function routeFromHash(): string {
  const h = location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return h.replace(/^main\/?/, '') || 'home';
}

export function MainApp() {
  const { state, error } = useAppState();
  const [route, setRoute] = useState(routeFromHash);

  useEffect(() => desktop.onNavigate((r) => setRoute(r || 'home')), []);
  useEffect(() => {
    void detectJapaneseVoice().then((ok) => desktop.setListening(ok));
  }, []);

  const go = (r: string) => {
    setRoute(r);
    history.replaceState(null, '', `#/main/${r}`);
  };

  if (error) return <div className="onboard">{t('common.error', { message: error })}</div>;
  if (!state) return <div className="onboard dim">{t('common.loading')}</div>;
  if (!state.onboarded) return <Onboarding state={state} />;

  const [base, sub] = route.split('/');
  const screen = (() => {
    switch (base) {
      case 'learn':
        return <Learn key={route} state={state} reviewOnly={sub === 'review'} go={go} />;
      case 'progress':
        return <Progress />;
      case 'library':
        return <Library state={state} />;
      case 'review':
        return <Library state={state} review />;
      case 'character':
        return <CharacterScreen state={state} />;
      case 'settings':
        return <Settings state={state} />;
      case 'about':
        return <About />;
      default:
        return <Home state={state} go={go} />;
    }
  })();

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <Mocchi mood="idle" cosmetic={state.character.selectedCosmetic} scale={1.25} animate={false} />
          <span className="display label" style={{ fontSize: 20 }}>
            {t('app.name')}
          </span>
        </div>
        {NAV.map((n) => (
          <button key={n.route} type="button" className="nav-btn" aria-current={base === n.route || (n.route === 'home' && !base) ? 'page' : undefined} onClick={() => go(n.route)} title={t(n.label)}>
            <PixelIcon name={n.icon} />
            <span className="label">{t(n.label)}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {!isElectron ? (
          <button type="button" className="nav-btn" onClick={() => void desktop.openQuiz('manual')} title="Preview the quiz pop-up">
            <PixelIcon name="star" />
            <span className="label">Pop-up preview</span>
          </button>
        ) : null}
      </nav>
      <main className="content">
        <div className="content-inner">{screen}</div>
      </main>
    </div>
  );
}
