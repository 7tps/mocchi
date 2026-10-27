import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setLocale } from '@jc/design-system';
import './styles.css';
import { MainApp } from './MainApp';
import { MenuApp } from './MenuApp';
import { isElectron } from './bridge';
import { TitleBar } from './components/TitleBar';
import { QuizApp } from './QuizApp';
import { WidgetApp } from './WidgetApp';

setLocale(navigator.language || 'en');

function surface(): 'widget' | 'quiz' | 'menu' | 'main' {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('widget')) return 'widget';
  if (h.startsWith('menu')) return 'menu';
  if (h.startsWith('quiz')) return 'quiz';
  return 'main';
}

function Root() {
  const [which, setWhich] = useState(surface);
  useEffect(() => {
    const h = () => setWhich(surface());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  if (which === 'widget') return <WidgetApp />;
  if (which === 'menu') return <MenuApp />;
  if (which === 'quiz') return <QuizApp key={location.hash} />;
  // The main window is frameless in Electron, so it gets the app's own title bar.
  return isElectron ? (
    <div className="window">
      <TitleBar />
      <MainApp />
    </div>
  ) : (
    <MainApp />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
