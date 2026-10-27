import { BrowserWindow, screen, shell } from 'electron';
import { join } from 'node:path';
import { clampToArea, defaultWidgetRect, placeNear, restoreRect, type Rect } from './geometry';
import { loadWindowState, saveWindowState, type WindowState } from './persist';

export const WIDGET_SIZE = { width: 132, height: 148 };
export const QUIZ_SIZE = { width: 400, height: 470 };

const isMac = process.platform === 'darwin';

function workAreas(): Rect[] {
  return screen.getAllDisplays().map((d) => d.workArea);
}

function loadRoute(win: BrowserWindow, route: string): void {
  const url = process.env.ELECTRON_RENDERER_URL;
  if (url) void win.loadURL(`${url}#/${route}`);
  else void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: `/${route}` });
}

function secure(win: BrowserWindow): void {
  // Open external links in the browser; never navigate the app window away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(process.env.ELECTRON_RENDERER_URL ?? 'file://')) e.preventDefault();
  });
}

const prefs = () => ({
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false,
});

/**
 * Owns the three windows: the floating character, the always-on-top quiz
 * pop-up and the conventional main window.
 */
export class WindowManager {
  widget: BrowserWindow | null = null;
  quiz: BrowserWindow | null = null;
  main: BrowserWindow | null = null;
  private state: WindowState = loadWindowState();
  private quitting = false;
  private dragTimer: NodeJS.Timeout | null = null;
  private dragStart: { cursor: { x: number; y: number }; win: { x: number; y: number }; moved: boolean } | null = null;

  setQuitting(): void {
    this.quitting = true;
  }

  createWidget(): BrowserWindow {
    if (this.widget && !this.widget.isDestroyed()) return this.widget;
    const area = screen.getPrimaryDisplay().workArea;
    const r = restoreRect(this.state.widget, defaultWidgetRect(area, WIDGET_SIZE), workAreas());
    const win = new BrowserWindow({
      ...r,
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      show: false,
      title: 'Mocchi',
      backgroundColor: '#00000000',
      webPreferences: prefs(),
    });
    win.setAlwaysOnTop(true, isMac ? 'floating' : 'pop-up-menu');
    if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
    secure(win);
    loadRoute(win, 'widget');
    win.once('ready-to-show', () => win.showInactive());
    win.on('closed', () => (this.widget = null));
    this.widget = win;
    return win;
  }

  setWidgetVisible(visible: boolean): void {
    if (visible) {
      const w = this.createWidget();
      if (!w.isVisible()) w.showInactive();
    } else {
      this.widget?.hide();
    }
  }

  /** Drag by polling the cursor: smooth on every platform and keeps clicks usable. */
  startWidgetDrag(): void {
    const w = this.widget;
    if (!w) return;
    const b = w.getBounds();
    this.dragStart = { cursor: screen.getCursorScreenPoint(), win: { x: b.x, y: b.y }, moved: false };
    this.stopDragTimer();
    this.dragTimer = setInterval(() => {
      if (!this.dragStart || !this.widget || this.widget.isDestroyed()) return this.stopDragTimer();
      const c = screen.getCursorScreenPoint();
      const dx = c.x - this.dragStart.cursor.x;
      const dy = c.y - this.dragStart.cursor.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragStart.moved = true;
      if (this.dragStart.moved) this.widget.setPosition(this.dragStart.win.x + dx, this.dragStart.win.y + dy);
    }, 16);
  }

  /** Returns true if the gesture was a click rather than a drag. */
  endWidgetDrag(): boolean {
    this.stopDragTimer();
    const moved = this.dragStart?.moved ?? false;
    this.dragStart = null;
    const w = this.widget;
    if (w && moved) {
      const b = clampToArea(w.getBounds(), screen.getDisplayMatching(w.getBounds()).workArea);
      w.setBounds(b);
      this.state.widget = b;
      saveWindowState(this.state);
    }
    return !moved;
  }

  private stopDragTimer(): void {
    if (this.dragTimer) clearInterval(this.dragTimer);
    this.dragTimer = null;
  }

  private quizRect(): Rect {
    if (this.state.quizMoved && this.state.quiz) return restoreRect(this.state.quiz, this.state.quiz, workAreas());
    const anchor = this.widget && !this.widget.isDestroyed() && this.widget.isVisible() ? this.widget.getBounds() : defaultWidgetRect(screen.getPrimaryDisplay().workArea, WIDGET_SIZE);
    return placeNear(anchor, QUIZ_SIZE, screen.getDisplayMatching(anchor).workArea);
  }

  /** Show the quiz pop-up above other windows. Focus is taken only if the user allows it. */
  showQuiz(takeFocus: boolean, query = ''): BrowserWindow {
    const r = this.quizRect();
    if (this.quiz && !this.quiz.isDestroyed()) {
      this.quiz.setBounds(r);
      loadRoute(this.quiz, `quiz${query}`);
      if (takeFocus) {
        this.quiz.show();
        this.quiz.focus();
      } else this.quiz.showInactive();
      return this.quiz;
    }
    const win = new BrowserWindow({
      ...r,
      frame: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      title: 'Mocchi quiz',
      backgroundColor: '#10162a',
      webPreferences: prefs(),
    });
    win.setAlwaysOnTop(true, isMac ? 'floating' : 'pop-up-menu');
    if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    secure(win);
    loadRoute(win, `quiz${query}`);
    win.once('ready-to-show', () => {
      if (takeFocus) {
        win.show();
        win.focus();
      } else win.showInactive();
    });
    win.on('moved', () => {
      this.state.quiz = win.getBounds();
      this.state.quizMoved = true;
      saveWindowState(this.state);
    });
    win.on('closed', () => (this.quiz = null));
    this.quiz = win;
    return win;
  }

  hideQuiz(): void {
    if (this.quiz && !this.quiz.isDestroyed()) this.quiz.close();
    this.quiz = null;
  }

  isQuizOpen(): boolean {
    return !!this.quiz && !this.quiz.isDestroyed() && this.quiz.isVisible();
  }

  hideMain(): void {
    if (this.main && !this.main.isDestroyed()) this.main.hide();
  }

  showMain(route = 'main'): BrowserWindow {
    if (this.main && !this.main.isDestroyed()) {
      if (route !== 'main') this.main.webContents.send('desktop:navigate', route.replace(/^main\/?/, ''));
      if (this.main.isMinimized()) this.main.restore();
      this.main.show();
      this.main.focus();
      return this.main;
    }
    const area = screen.getPrimaryDisplay().workArea;
    const fallback = { width: 1040, height: 740, x: area.x + Math.round((area.width - 1040) / 2), y: area.y + Math.round((area.height - 740) / 2) };
    const r = restoreRect(this.state.main, fallback, workAreas());
    const win = new BrowserWindow({
      ...r,
      minWidth: 760,
      minHeight: 560,
      show: false,
      title: 'Mocchi — Japanese companion',
      backgroundColor: '#10162a',
      autoHideMenuBar: true,
      webPreferences: prefs(),
    });
    secure(win);
    loadRoute(win, route);
    win.once('ready-to-show', () => win.show());
    const save = () => {
      if (!win.isMinimized() && !win.isMaximized()) {
        this.state.main = win.getBounds();
        saveWindowState(this.state);
      }
    };
    win.on('moved', save);
    win.on('resized', save);
    // Closing the main window keeps Mocchi running in the tray; Quit exits.
    win.on('close', (e) => {
      if (!this.quitting) {
        e.preventDefault();
        win.hide();
      }
    });
    win.on('closed', () => (this.main = null));
    this.main = win;
    return win;
  }

  /** Displays changed: pull every window back onto a visible work area. */
  reclamp(): void {
    for (const w of [this.widget, this.quiz, this.main]) {
      if (!w || w.isDestroyed()) continue;
      const b = w.getBounds();
      w.setBounds(clampToArea(b, screen.getDisplayMatching(b).workArea));
    }
  }

  broadcast(channel: string, ...args: unknown[]): void {
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(channel, ...args);
  }

  destroyAll(): void {
    this.stopDragTimer();
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.destroy();
  }
}
