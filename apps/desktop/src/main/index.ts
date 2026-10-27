import { app, dialog, ipcMain, Menu, nativeImage, Notification, screen, Tray } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SqliteTutorStore, TutorService, MigrationError, type TutorApi } from '@jc/app-core';
import { NodeSqliteDriver } from '@jc/app-core/node-sqlite';
import { t } from '@jc/design-system';
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

  let service: TutorService;
  try {
    service = new TutorService({
      store: new SqliteTutorStore(new NodeSqliteDriver(join(dataDir, 'mocchi.db'))),
      platform: 'desktop',
      secrets: new SafeSecretStore(),
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
  const scheduler = new DesktopScheduler(service, {
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
    const state = await service.getAppState();
    const paused = state.pause.indefinite || state.pause.until !== null;
    return Menu.buildFromTemplate([
      { label: t('tray.start'), enabled: state.onboarded, click: () => windows.showQuiz(true, '?source=manual') },
      { label: t('tray.open'), click: () => windows.showMain() },
      { type: 'separator' },
      {
        label: t('tray.showCharacter'),
        type: 'checkbox',
        checked: state.settings.characterVisible,
        click: (item) => void service.updateSettings({ characterVisible: item.checked }),
      },
      paused
        ? { label: t('tray.resume'), click: () => void service.resume() }
        : {
            label: t('tray.pause'),
            submenu: [
              { label: t('settings.pause1h'), click: () => void service.pause('1h') },
              { label: t('settings.pauseTomorrow'), click: () => void service.pause('tomorrow') },
              { label: t('settings.pauseForever'), click: () => void service.pause('indefinite') },
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
    const fn = (service as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method];
    if (typeof fn !== 'function') throw new Error(`Unknown method: ${method}`);
    // Sessions started by clicking Mocchi are extra practice: they don't restart the check-in cycle.
    return fn.apply(service, Array.isArray(args) ? args : []);
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
  ipcMain.handle('desktop:widget-menu', async () => (await buildMenu()).popup());
  ipcMain.handle('desktop:set-listening', (_e, available: boolean) => service.setListeningAvailable(!!available));
  ipcMain.handle('desktop:info', () => ({ version: app.getVersion(), platform: process.platform }));
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
    const state = await service.getAppState();
    const visible = state.settings.characterVisible && (state.onboarded || state.placementInProgress || state.hasPlacement);
    if (visible !== lastVisible) windows.setWidgetVisible(visible);
    lastVisible = visible;
    if (state.settings.launchAtStartup !== lastStartup && app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: state.settings.launchAtStartup });
    }
    lastStartup = state.settings.launchAtStartup;
  };
  service.subscribe((reason) => {
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
  const syncTimer = setInterval(() => void service.syncNow(), 5 * 60_000);
  app.on('before-quit', () => clearInterval(syncTimer));

  const state = await service.getAppState();
  if (!state.onboarded || process.argv.includes('--show')) windows.showMain();
  await applySettings();
  await scheduler.start();
  void service.syncNow();
}
