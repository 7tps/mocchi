import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';
import * as Speech from 'expo-speech';
import { SqliteTutorStore, TutorService, type AppState } from '@jc/app-core';
import { ExpoSqliteDriver, SecureSecretStore } from './platform';
import { reschedule } from './notifications';

const Ctx = createContext<TutorService | null>(null);

async function hasJapaneseVoice(): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.some((v) => v.language.toLowerCase().startsWith('ja'));
  } catch {
    return false;
  }
}

/** Creates the service once (SQLite + secure storage) and keeps notifications in sync with it. */
export function ServiceProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [service, setService] = useState<TutorService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const driver = await ExpoSqliteDriver.open();
      const svc = new TutorService({
        store: new SqliteTutorStore(driver),
        platform: 'mobile',
        secrets: new SecureSecretStore(),
        listeningAvailable: await hasJapaneseVoice(),
      });
      await svc.init();
      if (cancelled) return;
      // Reschedule reminders whenever learning state or preferences change.
      let timer: ReturnType<typeof setTimeout> | undefined;
      svc.subscribe((reason) => {
        if (reason === 'capabilities') return;
        clearTimeout(timer);
        timer = setTimeout(() => void reschedule(svc).catch(() => undefined), 500);
      });
      setService(svc);
      void reschedule(svc).catch(() => undefined);
      void svc.syncNow();
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back to the foreground: refresh reminders and sync.
  useEffect(() => {
    if (!service) return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void reschedule(service).catch(() => undefined);
        void service.syncNow();
      }
    });
    return () => sub.remove();
  }, [service]);

  if (error) throw new Error(error);
  if (!service) return <>{fallback}</>;
  return <Ctx.Provider value={service}>{children}</Ctx.Provider>;
}

export function useTutor(): TutorService {
  const s = useContext(Ctx);
  if (!s) throw new Error('useTutor outside ServiceProvider');
  return s;
}

export function useAppState(): AppState | null {
  const svc = useTutor();
  const [state, setState] = useState<AppState | null>(null);
  useEffect(() => {
    const load = () => void svc.getAppState().then(setState);
    load();
    return svc.subscribe(load);
  }, [svc]);
  return state;
}

export function useLoad<T>(loader: (svc: TutorService) => Promise<T>, deps: unknown[] = []): { data: T | null; reload: () => void } {
  const svc = useTutor();
  const [data, setData] = useState<T | null>(null);
  const ref = useRef(loader);
  ref.current = loader;
  const reload = useCallback(() => void ref.current(svc).then(setData).catch(() => undefined), [svc]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, deps);
  useEffect(() => svc.subscribe(() => reload()), [svc, reload]);
  return { data, reload };
}
