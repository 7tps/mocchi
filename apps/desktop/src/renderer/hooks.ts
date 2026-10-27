import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState } from '@jc/app-core';
import { api, onChanged } from './bridge';

/** Live app state, refreshed whenever the service reports a change. */
export function useAppState(): { state: AppState | null; error: string | null; refresh: () => void } {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    api
      .getAppState()
      .then((s) => {
        setState(s);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    refresh();
    return onChanged(() => refresh());
  }, [refresh]);
  useEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme;
    const systemReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    root.dataset.motion = state.settings.reducedMotion || systemReduced ? 'reduced' : 'full';
  }, [state]);
  return { state, error, refresh };
}

/** Run an async loader, re-running when deps change or the service changes. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = [], live = true): { data: T | null; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const reload = useCallback(() => {
    loaderRef
      .current()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, deps);
  useEffect(() => (live ? onChanged(() => reload()) : undefined), [live, reload]);
  return { data, error, reload };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const h = () => setReduced(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}
