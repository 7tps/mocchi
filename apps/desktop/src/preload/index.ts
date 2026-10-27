import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * Narrow bridge between renderers and the main process. The renderer never
 * gets Node or Electron objects — only these functions.
 */
const on = (channel: string, cb: (...args: unknown[]) => void) => {
  const listener = (_e: IpcRendererEvent, ...args: unknown[]) => cb(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('tutor', {
  call: (method: string, ...args: unknown[]) => ipcRenderer.invoke('tutor:call', method, args),
  onChanged: (cb: (reason: string) => void) => on('tutor:changed', (r) => cb(String(r))),
});

contextBridge.exposeInMainWorld('desktop', {
  widgetDragStart: () => ipcRenderer.invoke('desktop:widget-drag-start'),
  widgetDragEnd: () => ipcRenderer.invoke('desktop:widget-drag-end') as Promise<boolean>,
  widgetMenu: () => ipcRenderer.invoke('desktop:widget-menu'),
  menuReady: (size: { width: number; height: number }) => ipcRenderer.invoke('desktop:menu-ready', size),
  closeMenu: () => ipcRenderer.invoke('desktop:menu-close'),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  windowControl: (action: string) => ipcRenderer.invoke('desktop:window-control', action),
  windowState: () => ipcRenderer.invoke('desktop:window-state'),
  onWindowState: (cb: (s: unknown) => void) => on('desktop:window-state', (s) => cb(s)),
  openMain: (route?: string) => ipcRenderer.invoke('desktop:open-main', route),
  openQuiz: (source?: string) => ipcRenderer.invoke('desktop:open-quiz', source),
  closeQuiz: () => ipcRenderer.invoke('desktop:close-quiz'),
  expandQuiz: () => ipcRenderer.invoke('desktop:expand-quiz'),
  openPlacement: () => ipcRenderer.invoke('desktop:open-placement'),
  setListening: (available: boolean) => ipcRenderer.invoke('desktop:set-listening', available),
  saveExport: (json: string) => ipcRenderer.invoke('desktop:save-export', json) as Promise<string | null>,
  info: () => ipcRenderer.invoke('desktop:info'),
  openVoiceSettings: () => ipcRenderer.invoke('desktop:open-voice-settings') as Promise<boolean>,
  relaunch: () => ipcRenderer.invoke('desktop:relaunch'),
  contentStatus: () => ipcRenderer.invoke('desktop:content-status'),
  setContentLevel: (level: string) => ipcRenderer.invoke('desktop:content-set-level', level),
  retryContent: () => ipcRenderer.invoke('desktop:content-retry'),
  onContent: (cb: (status: unknown) => void) => on('desktop:content', (s) => cb(s)),
  onPrompt: (cb: () => void) => on('desktop:prompt', () => cb()),
  onNavigate: (cb: (route: string) => void) => on('desktop:navigate', (r) => cb(String(r))),
  onScheduler: (cb: (status: unknown) => void) => on('desktop:scheduler', (s) => cb(s)),
});
