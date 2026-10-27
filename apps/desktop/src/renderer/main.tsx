import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setLocale } from '@jc/design-system';
import './styles.css';
import { MainApp } from './MainApp';
import { QuizApp } from './QuizApp';
import { WidgetApp } from './WidgetApp';

setLocale(navigator.language || 'en');

function surface(): 'widget' | 'quiz' | 'main' {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('widget')) return 'widget';
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
  if (which === 'quiz') return <QuizApp key={location.hash} />;
  return <MainApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
