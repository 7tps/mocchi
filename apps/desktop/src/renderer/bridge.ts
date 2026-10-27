import type { TutorApi, TutorService } from '@jc/app-core';

export interface DesktopBridge {
  widgetDragStart(): Promise<void>;
  widgetDragEnd(): Promise<boolean>;
  widgetMenu(): Promise<void>;
  openMain(route?: string): Promise<void>;
  openQuiz(source?: string): Promise<void>;
  closeQuiz(): Promise<void>;
  /** Run the placement exam in the corner pop-up next to Mocchi. */
  openPlacement(): Promise<void>;
  setListening(available: boolean): Promise<void>;
  saveExport(json: string): Promise<string | null>;
  info(): Promise<{ version: string; platform: string }>;
  onPrompt(cb: () => void): () => void;
  onNavigate(cb: (route: string) => void): () => void;
  onScheduler(cb: (status: unknown) => void): () => void;
}

interface TutorBridge {
  call(method: string, ...args: unknown[]): Promise<unknown>;
  onChanged(cb: (reason: string) => void): () => void;
}

declare global {
  interface Window {
    tutor?: TutorBridge;
    desktop?: DesktopBridge;
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.tutor;

// ---------------------------------------------------------------------------
// Browser preview: run the real service in-page with localStorage persistence.
// ---------------------------------------------------------------------------

const changeListeners = new Set<(reason: string) => void>();
let localService: Promise<TutorService> | null = null;

function getLocal(): Promise<TutorService> {
  if (!localService) {
    localService = (async () => {
      const { TutorService, MemoryTutorStore } = await import('@jc/app-core');
      const key = 'mocchi-preview-v1';
      const store = new MemoryTutorStore({
        load: () => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        save: (data) => {
          try {
            localStorage.setItem(key, data);
          } catch {
            // Storage full or blocked: keep running in memory.
          }
        },
      });
      const svc = new TutorService({ store, platform: 'web' });
      await svc.init();
      svc.subscribe((r) => changeListeners.forEach((fn) => fn(r)));
      return svc;
    })();
  }
  return localService;
}

export const api: TutorApi = new Proxy({} as TutorApi, {
  get(_target, method: string) {
    return (...args: unknown[]) => {
      if (isElectron) return window.tutor!.call(method, ...args);
      return getLocal().then((s) => (s as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method]!.apply(s, args));
    };
  },
});

/** Exposed for the browser preview only (capability reporting). */
export async function localServiceForPreview(): Promise<TutorService | null> {
  return isElectron ? null : getLocal();
}

export function onChanged(cb: (reason: string) => void): () => void {
  if (isElectron) return window.tutor!.onChanged(cb);
  changeListeners.add(cb);
  return () => changeListeners.delete(cb);
}

const noopOff = () => () => undefined;

const browserDesktop: DesktopBridge = {
  widgetDragStart: async () => undefined,
  widgetDragEnd: async () => true,
  widgetMenu: async () => undefined,
  openMain: async (route) => {
    location.hash = `#/${route ?? 'main'}`;
  },
  openQuiz: async (source) => {
    location.hash = `#/quiz?source=${source ?? 'manual'}`;
  },
  closeQuiz: async () => {
    location.hash = '#/main';
  },
  openPlacement: async () => {
    location.hash = '#/quiz?mode=placement';
  },
  setListening: async (available) => {
    (await getLocal()).setListeningAvailable(available);
  },
  saveExport: async (json) => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocchi-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return a.download;
  },
  info: async () => ({ version: '0.1.0 (browser preview)', platform: 'web' }),
  onPrompt: noopOff,
  onNavigate: (cb) => {
    const h = () => cb(location.hash.replace(/^#\/main\/?/, ''));
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  },
  onScheduler: noopOff,
};

export const desktop: DesktopBridge = (typeof window !== 'undefined' && window.desktop) || browserDesktop;
