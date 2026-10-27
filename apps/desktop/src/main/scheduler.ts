import { powerMonitor } from 'electron';
import type { TutorService } from '@jc/app-core';
import { decideDesktopPrompt, nextPromptInterval } from '@jc/learning-engine';
import type { SchedulerDecision } from '@jc/shared-types';
import { ActivityTracker } from './activity';

export interface SchedulerHooks {
  isQuizOpen(): boolean;
  showPrompt(takeFocus: boolean): void;
  notify(kind: 'review' | 'away', dueCount: number): void;
  status(decision: SchedulerDecision & { activeMinutes: number; targetMinutes: number }): void;
}

/** MOCCHI_SCHEDULER_DEBUG=1 shortens the tick, start-up grace and activity target for manual testing. */
const DEBUG = process.env.MOCCHI_SCHEDULER_DEBUG === '1';
const TICK_MS = DEBUG ? 5_000 : 30_000;
const AWAY_NOTIFY_MS = 30 * 60_000;

/**
 * Desktop adapter for the shared interruption policy. It feeds the policy
 * with OS idle time (the only activity signal used) and turns "show"
 * decisions into a pop-up or a native notification.
 */
export class DesktopScheduler {
  private timer: NodeJS.Timeout | null = null;
  private readonly activity = new ActivityTracker({ idleThresholdSec: 120 });
  private readonly startedAt = DEBUG ? Date.now() - 60 * 60_000 : Date.now();
  private target = 40;
  private awayNotified = false;
  private ticking = false;

  constructor(private readonly service: TutorService, private readonly hooks: SchedulerHooks) {}

  async start(): Promise<void> {
    if (this.timer) return; // never run two timers
    const snap = await this.service.getSchedulerSnapshot();
    this.target = DEBUG ? 0.5 : nextPromptInterval(snap.settings, `${snap.timeZone}:${this.startedAt}`);
    powerMonitor.on('suspend', this.onSuspend);
    powerMonitor.on('lock-screen', this.onSuspend);
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    powerMonitor.removeListener('suspend', this.onSuspend);
    powerMonitor.removeListener('lock-screen', this.onSuspend);
  }

  private onSuspend = () => this.activity.suspend();

  /** A session happened (manual or prompted): restart the activity cycle. */
  async resetCycle(): Promise<void> {
    this.activity.reset();
    const snap = await this.service.getSchedulerSnapshot();
    this.target = DEBUG ? 0.5 : nextPromptInterval(snap.settings, `${Date.now()}`);
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = Date.now();
      this.activity.tick(now, powerMonitor.getSystemIdleTime());
      const snap = await this.service.getSchedulerSnapshot();
      if (!snap.onboarded || this.hooks.isQuizOpen()) return;
      const decision = decideDesktopPrompt({
        now,
        timeZone: snap.timeZone,
        settings: snap.settings,
        pause: snap.pause,
        snoozeUntil: snap.snoozeUntil,
        appStartedAt: this.startedAt,
        lastPromptAt: snap.lastPromptAt,
        promptsToday: snap.promptsToday,
        questionsToday: snap.promptedQuestionsToday,
        dueCount: snap.dueCount,
        newAvailable: snap.newAvailable,
        activeMinutes: this.activity.activeMinutes(),
        targetActiveMinutes: this.target,
        idle: this.activity.isIdle(),
      });
      this.hooks.status({ ...decision, activeMinutes: this.activity.activeMinutes(), targetMinutes: this.target });
      if (!this.activity.isIdle()) this.awayNotified = false;
      if (decision.show) {
        await this.prompt();
      } else if (
        this.activity.isIdle() &&
        this.activity.idleForMs(now) > AWAY_NOTIFY_MS &&
        !this.awayNotified &&
        snap.settings.desktopNotifications &&
        snap.dueCount >= 5 &&
        this.activity.activeMinutes() >= this.target
      ) {
        // Away for a while with reviews piling up: leave one quiet notification.
        this.awayNotified = true;
        this.hooks.notify('away', snap.dueCount);
      }
    } catch {
      // Database or OS errors must never crash the tray app; try again next tick.
    } finally {
      this.ticking = false;
    }
  }

  /** Offer a session now (scheduled or from the tray). */
  async prompt(): Promise<void> {
    const snap = await this.service.getSchedulerSnapshot();
    await this.service.recordPrompt();
    await this.resetCycle();
    if (snap.settings.popupEnabled) {
      this.hooks.showPrompt(snap.settings.popupTakesFocus);
      if (snap.settings.notifyAlongsidePopup && snap.settings.desktopNotifications) this.hooks.notify('review', snap.dueCount);
    } else if (snap.settings.desktopNotifications) {
      this.hooks.notify('review', snap.dueCount);
    }
  }
}
