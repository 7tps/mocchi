import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SqliteTutorStore, TutorService, MigrationError, type TutorApi } from '@jc/app-core';
import { NodeSqliteDriver } from '@jc/app-core/node-sqlite';
import { t } from '@jc/design-system';
import { countsByLevel, getLibrary, libraryWithPacks } from '@jc/japanese-content';
import type { JlptBand } from '@jc/shared-types';
import { ContentManager } from './content';
import { WindowManager } from './windows';
import { DesktopScheduler } from './scheduler';
import { SafeSecretStore } from './persist';
import trayIcon from '../../../../assets/ui/tray-32.png?asset';
import appIcon from '../../../../assets/ui/icon-256.png?asset';

// The service surface the renderer may call. Anything else is rejected.
const ALLOWED: ReadonlyArray<keyof TutorApi> = [
  'getAppState', 'getDashboard', 'beginPlacement', 'resumePlacement', 'answerPlacement', 'nextPlacement', 'finishPlacement',
  'startAsBeginner', 'completeOnboarding', 'startSession', 'answerQuestion', 'finishSession', 'dismissSession', 'updateSettings',
  'pause', 'resume', 'snooze', 'getLibrary', 'getReviewQueue', 'selectCosmetic', 'exportData', 'clearAllData', 'getSyncStatus',
  'createAccount', 'getLinkCode', 'linkWithCode', 'syncNow', 'unlinkAccount', 'deleteAccount', 'planNotifications',
];

// Isolated profile for development and automated checks.
if (process.env.MOCCHI_USER_DATA) app.setPath('userData', process.env.MOCCHI_USER_DATA);

if (!app.requestSingleInstanceLock()) {
  // A second launch would duplicate timers and windows: hand off to the first instance.
  app.quit();
} else {
  void main();
}

async function main(): Promise<void> {
  app.setAppUserModelId('app.mocchi.companion');
  await app.whenReady();

  const windows = new WindowManager();
  const dataDir = app.getPath('userData');
  mkdirSync(dataDir, { recursive: true });

  // JLPT level packs: shipped/downloaded by the installer into resources/content,
  // or downloaded later into userData/content. In development, `npm run content:build` output.
  let service: TutorService | undefined;
  const content = new ContentManager({
    resourcesDir: app.isPackaged ? join(process.resourcesPath, 'content') : join(app.getAppPath(), '../../dist/content'),
    userDir: join(dataDir, 'content'),
    baseUrl: process.env.MOCCHI_CONTENT_URL,
    bundledCounts: countsByLevel(getLibrary()),
    onChange: (status) => windows.broadcast('desktop:content', status),
    onPacks: (packs) => service?.replaceLibrary(libraryWithPacks(getLibrary(), packs)),
  });

  try {
    service = new TutorService({
      store: new SqliteTutorStore(new NodeSqliteDriver(join(dataDir, 'mocchi.db'))),
      platform: 'desktop',
      secrets: new SafeSecretStore(),
      library: libraryWithPacks(getLibrary(), content.load()),
    });
    await service.init();
  } catch (err) {
    const migration = err instanceof MigrationError;
    dialog.showErrorBox(
      'Mocchi could not open its data',
      migration
        ? `${(err as Error).message}\n\nYour data was not modified. Please update Mocchi, or move ${join(dataDir, 'mocchi.db')} aside to start fresh.`
        : `The local database could not be opened: ${err instanceof Error ? err.message : String(err)}`,
    );
    app.exit(1);
    return;
  }
  const svc: TutorService = service;

  // ---- Notifications ----------------------------------------------------
  const notify = (kind: 'review' | 'away', due: number) => {
    if (!Notification.isSupported()) return;
    const n =
      due > 0
        ? new Notification({ title: t('notify.review.title'), body: t('notify.review.body', { n: due, minutes: Math.max(1, Math.round(due * 0.4)) }), icon: appIcon, silent: kind === 'away' })
        : new Notification({ title: t('notify.new.title'), body: t('notify.new.body'), icon: appIcon });
    n.on('click', () => windows.showQuiz(true));
    n.show();
  };

  // ---- Scheduler --------------------------------------------------------
  const scheduler = new DesktopScheduler(svc, {
    isQuizOpen: () => windows.isQuizOpen(),
    showPrompt: (takeFocus) => {
      windows.broadcast('desktop:prompt');
      windows.showQuiz(takeFocus, '?source=scheduled');
    },
    notify,
    status: (s) => windows.broadcast('desktop:scheduler', s),
  });

  // ---- Tray -------------------------------------------------------------
  const tray = new Tray(nativeImage.createFromPath(trayIcon));
  tray.setToolTip('Mocchi');
  const buildMenu = async () => {
    const state = await svc.getAppState();
    const paused = state.pause.indefinite || state.pause.until !== null;
    return Menu.buildFromTemplate([
      { label: t('tray.start'), enabled: state.onboarded, click: () => windows.showQuiz(true, '?source=manual') },
      { label: t('tray.open'), click: () => windows.showMain() },
      { type: 'separator' },
      {
        label: t('tray.showCharacter'),
        type: 'checkbox',
        checked: state.settings.characterVisible,
        click: (item) => void svc.updateSettings({ characterVisible: item.checked }),
      },
      paused
        ? { label: t('tray.resume'), click: () => void svc.resume() }
        : {
            label: t('tray.pause'),
            submenu: [
              { label: t('settings.pause1h'), click: () => void svc.pause('1h') },
              { label: t('settings.pauseTomorrow'), click: () => void svc.pause('tomorrow') },
              { label: t('settings.pauseForever'), click: () => void svc.pause('indefinite') },
            ],
          },
      { type: 'separator' },
      { label: t('nav.settings'), click: () => windows.showMain('main/settings') },
      { label: t('tray.quit'), click: () => app.quit() },
    ]);
  };
  const refreshTray = async () => tray.setContextMenu(await buildMenu());
  tray.on('click', () => windows.showMain());
  await refreshTray();

  // ---- IPC --------------------------------------------------------------
  ipcMain.handle('tutor:call', async (_e, method: string, args: unknown[]) => {
    if (!(ALLOWED as readonly string[]).includes(method)) throw new Error(`Method not allowed: ${method}`);
    const fn = (svc as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method];
    if (typeof fn !== 'function') throw new Error(`Unknown method: ${method}`);
    // Sessions started by clicking Mocchi are extra practice: they don't restart the check-in cycle.
    return fn.apply(svc, Array.isArray(args) ? args : []);
  });
  ipcMain.handle('desktop:widget-drag-start', () => windows.startWidgetDrag());
  ipcMain.handle('desktop:widget-drag-end', () => windows.endWidgetDrag());
  ipcMain.handle('desktop:open-main', (_e, route?: string) => void windows.showMain(typeof route === 'string' ? route : 'main'));
  ipcMain.handle('desktop:open-quiz', (_e, source?: string) => void windows.showQuiz(true, `?source=${source === 'review' ? 'review' : 'manual'}`));
  ipcMain.handle('desktop:close-quiz', () => windows.hideQuiz());
  // The placement exam is delivered like any other quiz: in the pop-up beside the corner character.
  ipcMain.handle('desktop:open-placement', () => {
    windows.hideMain();
    windows.setWidgetVisible(true);
    windows.showQuiz(true, '?mode=placement');
  });
  // The character's menu is drawn by the app (#/menu); the tray keeps the native menu.
  ipcMain.handle('desktop:widget-menu', () => windows.showMenu());
  ipcMain.handle('desktop:menu-ready', (_e, size: { width: number; height: number }) => {
    if (size && Number.isFinite(size.width) && Number.isFinite(size.height)) windows.menuReady(size);
  });
  ipcMain.handle('desktop:menu-close', () => windows.closeMenu());
  ipcMain.handle('desktop:quit', () => app.quit());
  // Buttons of the app-drawn title bar (the main window is frameless on Windows/Linux).
  ipcMain.handle('desktop:window-control', (e, action: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (action === 'minimize') win.minimize();
    else if (action === 'toggle-maximize') {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    } else if (action === 'close') win.close();
  });
  ipcMain.handle('desktop:window-state', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    return { maximized: !!win && (win.isMaximized() || win.isFullScreen()) };
  });
  ipcMain.handle('desktop:set-listening', (_e, available: boolean) => svc.setListeningAvailable(!!available));
  ipcMain.handle('desktop:info', () => ({ version: app.getVersion(), platform: process.platform }));
  // Listening practice needs an OS Japanese voice; Settings links straight to where it is installed.
  ipcMain.handle('desktop:open-voice-settings', async () => {
    if (process.platform !== 'win32') return false;
    await shell.openExternal('ms-settings:speech');
    return true;
  });
  // Chromium only reads the installed voices at start-up, so a new voice needs a restart.
  ipcMain.handle('desktop:relaunch', () => {
    app.relaunch();
    app.quit();
  });
  ipcMain.handle('desktop:content-status', () => content.status());
  ipcMain.handle('desktop:content-set-level', (_e, level: JlptBand) => content.setTargetLevel(level));
  ipcMain.handle('desktop:content-retry', () => content.downloadMissing());
  ipcMain.handle('desktop:save-export', async (_e, json: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: t('about.export'),
      defaultPath: join(app.getPath('documents'), `mocchi-export-${new Date().toISOString().slice(0, 10)}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return null;
    writeFileSync(filePath, String(json));
    return filePath;
  });

  // ---- React to service changes ----------------------------------------
  let lastVisible: boolean | null = null;
  let lastStartup: boolean | null = null;
  const applySettings = async () => {
    const state = await svc.getAppState();
    const visible = state.settings.characterVisible && (state.onboarded || state.placementInProgress || state.hasPlacement);
    if (visible !== lastVisible) windows.setWidgetVisible(visible);
    lastVisible = visible;
    if (state.settings.launchAtStartup !== lastStartup && app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: state.settings.launchAtStartup });
    }
    lastStartup = state.settings.launchAtStartup;
  };
  svc.subscribe((reason) => {
    windows.broadcast('tutor:changed', reason);
    void refreshTray();
    void applySettings();
  });

  screen.on('display-removed', () => windows.reclamp());
  screen.on('display-metrics-changed', () => windows.reclamp());
  app.on('second-instance', () => windows.showMain());
  app.on('activate', () => windows.showMain());
  app.on('window-all-closed', () => {
    // Keep running in the tray.
  });
  app.on('before-quit', () => {
    windows.setQuitting();
    scheduler.stop();
    tray.destroy();
  });

  // Background sync every 5 minutes when enabled; failures are reported in Settings.
  const syncTimer = setInterval(() => void svc.syncNow(), 5 * 60_000);
  app.on('before-quit', () => clearInterval(syncTimer));

  const state = await svc.getAppState();
  if (!state.onboarded || process.argv.includes('--show')) windows.showMain();
  await applySettings();
  await scheduler.start();
  void svc.syncNow();
  // Fetch any level the installer could not download (offline, failed checksum…).
  void content.downloadMissing();
}
