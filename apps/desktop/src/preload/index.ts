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
  openMain: (route?: string) => ipcRenderer.invoke('desktop:open-main', route),
  openQuiz: (source?: string) => ipcRenderer.invoke('desktop:open-quiz', source),
  closeQuiz: () => ipcRenderer.invoke('desktop:close-quiz'),
  openPlacement: () => ipcRenderer.invoke('desktop:open-placement'),
  setListening: (available: boolean) => ipcRenderer.invoke('desktop:set-listening', available),
  saveExport: (json: string) => ipcRenderer.invoke('desktop:save-export', json) as Promise<string | null>,
  info: () => ipcRenderer.invoke('desktop:info'),
  onPrompt: (cb: () => void) => on('desktop:prompt', () => cb()),
  onNavigate: (cb: (route: string) => void) => on('desktop:navigate', (r) => cb(String(r))),
  onScheduler: (cb: (status: unknown) => void) => on('desktop:scheduler', (s) => cb(s)),
});
