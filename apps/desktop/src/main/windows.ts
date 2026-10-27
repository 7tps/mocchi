import { BrowserWindow, nativeImage, screen, shell } from 'electron';
import { join } from 'node:path';
import { MOODS, SPRITE_SIZE, frameCount, renderFrame } from '@jc/design-system';
import { areaFor, clampToArea, defaultWidgetRect, placeMenu, placeNear, placeWidget, restoreRect, type Insets, type Rect } from './geometry';
import { loadWindowState, saveWindowState, type WindowState } from './persist';
import appIcon from '../../../../assets/ui/icon-256.png?asset';

export const WIDGET_SIZE = { width: 132, height: 148 };
/** The widget draws the 32px sprite at 3× (96px), centred at the bottom; space above is for the speech bubble. */
const WIDGET_SCALE = 3;

/** Transparent margins around the visible sprite pixels, so the sprite itself can sit flush against a screen edge. */
const WIDGET_INSETS: Insets = (() => {
  let minX = SPRITE_SIZE, maxX = -1, minY = SPRITE_SIZE, maxY = -1;
  for (const mood of MOODS) {
    for (let i = 0; i < frameCount(mood); i++) {
      const frame = renderFrame(mood, i, null);
      for (let p = 0; p < frame.length; p++) {
        if (!frame[p]) continue;
        const x = p % SPRITE_SIZE;
        const y = Math.floor(p / SPRITE_SIZE);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const spriteLeft = (WIDGET_SIZE.width - SPRITE_SIZE * WIDGET_SCALE) / 2;
  const spriteTop = WIDGET_SIZE.height - SPRITE_SIZE * WIDGET_SCALE;
  return {
    left: spriteLeft + minX * WIDGET_SCALE,
    right: WIDGET_SIZE.width - (spriteLeft + (maxX + 1) * WIDGET_SCALE),
    top: spriteTop + minY * WIDGET_SCALE,
    bottom: WIDGET_SIZE.height - (spriteTop + (maxY + 1) * WIDGET_SCALE),
  };
})();

/** Fixed-size widget rect at a position. */
const widgetAt = (x: number, y: number): Rect => ({ x: Math.round(x), y: Math.round(y), ...WIDGET_SIZE });
export const QUIZ_SIZE = { width: 400, height: 470 };
/** Check-ins first appear as this small "Start questions" card, then grow into the quiz. */
export const INVITE_SIZE = { width: 340, height: 168 };

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

// Mocchi's sprite for the taskbar / Alt-Tab / title bar (otherwise Electron's logo shows in development).
const icon = nativeImage.createFromPath(appIcon);

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
  /** The quiz window is showing the check-in invite (small), not questions yet. */
  private quizInvite = false;
  main: BrowserWindow | null = null;
  private menu: BrowserWindow | null = null;
  private menuAt: { x: number; y: number } | null = null;
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
    // Saved sizes are ignored: older builds could save a window that had grown (see startWidgetDrag).
    const saved = this.state.widget ? widgetAt(this.state.widget.x, this.state.widget.y) : defaultWidgetRect(area, WIDGET_SIZE);
    const r = placeWidget(saved, areaFor(saved, workAreas()), WIDGET_INSETS, 0);
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
      icon,
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
      // setBounds with the fixed size, not setPosition: at fractional display scaling (125 %, 150 %)
      // Windows rounds the window outward on every move, so it grows and the sprite drifts.
      if (this.dragStart.moved) this.widget.setBounds(widgetAt(this.dragStart.win.x + dx, this.dragStart.win.y + dy));
    }, 16);
  }

  /** Returns true if the gesture was a click rather than a drag. */
  endWidgetDrag(): boolean {
    this.stopDragTimer();
    const moved = this.dragStart?.moved ?? false;
    this.dragStart = null;
    const w = this.widget;
    if (w && moved) {
      const current = w.getBounds();
      const at = widgetAt(current.x, current.y);
      const b = placeWidget(at, screen.getDisplayMatching(at).workArea, WIDGET_INSETS);
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

  private inviteRect(): Rect {
    if (this.state.quizMoved && this.state.quiz) {
      const r = { x: this.state.quiz.x, y: this.state.quiz.y, ...INVITE_SIZE };
      return restoreRect(r, r, workAreas());
    }
    const anchor = this.widget && !this.widget.isDestroyed() && this.widget.isVisible() ? this.widget.getBounds() : defaultWidgetRect(screen.getPrimaryDisplay().workArea, WIDGET_SIZE);
    return placeNear(anchor, INVITE_SIZE, screen.getDisplayMatching(anchor).workArea);
  }

  /**
   * Show the quiz pop-up above other windows. Focus is taken only if the user allows it.
   * With `invite`, it opens as a small card that asks before any questions appear.
   */
  showQuiz(takeFocus: boolean, query = '', invite = false): BrowserWindow {
    this.quizInvite = invite;
    const r = invite ? this.inviteRect() : this.quizRect();
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
      icon,
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
      // Remember where the quiz goes; a moved invite keeps its position but not its small size.
      this.state.quiz = this.quizInvite ? { ...win.getBounds(), ...QUIZ_SIZE } : win.getBounds();
      this.state.quizMoved = true;
      saveWindowState(this.state);
    });
    win.on('closed', () => (this.quiz = null));
    this.quiz = win;
    return win;
  }

  /**
   * The character's right-click menu, drawn by the renderer (#/menu) so it matches
   * the app. It opens hidden; the renderer reports its size, then it is shown at the cursor.
   */
  showMenu(): void {
    this.closeMenu();
    const cursor = screen.getCursorScreenPoint();
    const win = new BrowserWindow({
      x: cursor.x,
      y: cursor.y,
      width: 240,
      height: 320,
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      title: 'Mocchi menu',
      icon,
      backgroundColor: '#00000000',
      webPreferences: prefs(),
    });
    win.setAlwaysOnTop(true, isMac ? 'floating' : 'pop-up-menu');
    secure(win);
    loadRoute(win, 'menu');
    // Like a native menu: clicking anywhere else dismisses it.
    win.on('blur', () => this.closeMenu());
    win.on('closed', () => {
      if (this.menu === win) this.menu = null;
    });
    this.menu = win;
    this.menuAt = cursor;
  }

  /** The menu has rendered: size it to its content and show it next to the cursor. */
  menuReady(size: { width: number; height: number }): void {
    const w = this.menu;
    if (!w || w.isDestroyed() || !this.menuAt) return;
    const s = { width: Math.ceil(Math.min(Math.max(size.width, 120), 400)), height: Math.ceil(Math.min(Math.max(size.height, 40), 600)) };
    w.setBounds(placeMenu(this.menuAt, s, screen.getDisplayNearestPoint(this.menuAt).workArea));
    if (!w.isVisible()) {
      w.show();
      w.focus();
    }
  }

  closeMenu(): void {
    const w = this.menu;
    this.menu = null;
    if (w && !w.isDestroyed()) w.close();
  }

  /** The learner chose to start: grow the invite into the full quiz. */
  expandQuiz(): void {
    if (!this.quiz || this.quiz.isDestroyed() || !this.quizInvite) return;
    this.quizInvite = false;
    this.quiz.setBounds(this.quizRect());
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
      icon,
      backgroundColor: '#10162a',
      // The renderer draws a themed title bar (TitleBar.tsx). macOS keeps its traffic lights.
      ...(isMac ? { titleBarStyle: 'hiddenInset' as const } : { frame: false }),
      webPreferences: prefs(),
    });
    secure(win);
    loadRoute(win, route);
    const sendState = () => win.webContents.send('desktop:window-state', { maximized: win.isMaximized() || win.isFullScreen() });
    win.on('maximize', sendState);
    win.on('unmaximize', sendState);
    win.on('enter-full-screen', sendState);
    win.on('leave-full-screen', sendState);
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
      if (w === this.widget) {
        const at = widgetAt(b.x, b.y);
        w.setBounds(placeWidget(at, areaFor(at, workAreas()), WIDGET_INSETS, 0));
      } else w.setBounds(clampToArea(b, screen.getDisplayMatching(b).workArea));
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
