import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { MemorySecretStore, MigrationError, SqliteTutorStore, TutorService } from '@jc/app-core';
import { NodeSqliteDriver } from '@jc/app-core/node-sqlite';
import { DAY, HOUR, MINUTE } from '@jc/shared-utils';
import { decideDesktopPrompt } from '@jc/learning-engine';
import { createApi } from '../services/api/src/app';

const dir = mkdtempSync(join(tmpdir(), 'jc-int-'));
let n = 0;
const dbFile = () => join(dir, `t${n++}.db`);

/** Controllable clock so tests can move through days. */
function clock(start = Date.UTC(2026, 9, 26, 1, 0)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms), set: (v: number) => (t = v) };
}

async function makeService(path: string, c = clock(), tz = 'Asia/Tokyo', secrets = new MemorySecretStore()) {
  const svc = new TutorService({ store: new SqliteTutorStore(new NodeSqliteDriver(path)), platform: 'desktop', now: c.now, timeZone: () => tz, secrets });
  await svc.init();
  return svc;
}

/** Test-only peek at the answer key held inside the service. */
function answerFor(svc: TutorService, sessionId: string, questionId: string): string | string[] {
  const active = (svc as unknown as { active: Map<string, { plan: Array<{ question: { id: string; answer: string; mode: string; tokens?: string[] } }> }> }).active.get(sessionId);
  const q = active?.plan.find((p) => p.question.id === questionId)?.question;
  if (!q) throw new Error('question not found');
  return q.mode === 'arrange' ? [q.answer] : q.answer;
}

async function placementAllDontKnow(svc: TutorService) {
  let view = await svc.beginPlacement('none');
  while (!view.finished && view.question) {
    await svc.answerPlacement(null);
    view = await svc.nextPlacement();
  }
  return svc.finishPlacement();
}

afterAll(() => {
  // Windows keeps SQLite files locked until the process exits; cleanup is best-effort.
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 2 });
  } catch {
    /* left for the OS temp cleaner */
  }
});

describe('journey: complete beginner', () => {
  const path = dbFile();
  const c = clock();

  it('takes the exam, gets a beginner plan and completes a first quiz', async () => {
    const svc = await makeService(path, c);
    expect((await svc.getAppState()).onboarded).toBe(false);
    const result = await placementAllDontKnow(svc);
    expect(result.band).toBe('pre-N5');
    expect(result.questionCount).toBeGreaterThanOrEqual(20);
    await svc.completeOnboarding({ experience: 'none', settings: { dailyGoalQuestions: 10 } });
    const session = await svc.startSession('manual');
    expect(session).not.toBeNull();
    for (const q of session!.questions) expect(q.skill).toBe('hiragana');
    const [q1, q2] = session!.questions;
    const right = await svc.answerQuestion(session!.id, q1!.id, answerFor(svc, session!.id, q1!.id), 3000);
    expect(right.correct).toBe(true);
    expect(right.explanation.length).toBeGreaterThan(0);
    const wrong = await svc.answerQuestion(session!.id, q2!.id, 'definitely wrong', 3000);
    expect(wrong.correct).toBe(false);
    expect(wrong.answer.length).toBeGreaterThan(0);
    const summary = await svc.finishSession(session!.id);
    expect(summary.answered).toBe(2);
    expect(summary.xp).toBeGreaterThan(0);
    expect(summary.newMilestones).toContain('first-session');
  });

  it('keeps placement results and progress after a restart', async () => {
    const svc = await makeService(path, c);
    const state = await svc.getAppState();
    expect(state.onboarded).toBe(true);
    expect(state.placement?.band).toBe('pre-N5');
    expect(state.settings.dailyGoalQuestions).toBe(10);
    const dash = await svc.getDashboard();
    expect(dash.stats.questionsAnswered).toBe(2);
    expect(dash.stats.counts.introduced).toBe(2);
    expect(state.character.xp).toBeGreaterThan(0);
  });
});

describe('journey: review scheduling', () => {
  it('pushes a correct answer later and brings a repeatedly wrong item back', async () => {
    const c = clock();
    const svc = await makeService(dbFile(), c);
    await placementAllDontKnow(svc);
    await svc.completeOnboarding({});
    const s = (await svc.startSession('manual', { length: 2 }))!;
    const [a, b] = s.questions;
    const fa = await svc.answerQuestion(s.id, a!.id, answerFor(svc, s.id, a!.id), 2000);
    const fb = await svc.answerQuestion(s.id, b!.id, 'zzz', 2000);
    expect(fa.nextReviewAt - c.now()).toBeGreaterThan(fb.nextReviewAt - c.now());
    await svc.finishSession(s.id);
    // Wrong again a bit later, then check it keeps coming back soon.
    let seen = 0;
    for (let round = 0; round < 3; round++) {
      c.advance(15 * MINUTE);
      const s2 = (await svc.startSession('manual', { length: 3 }))!;
      const again = s2.questions.find((q) => q.itemId === b!.itemId);
      if (again) {
        seen++;
        await svc.answerQuestion(s2.id, again.id, 'zzz');
      }
      await svc.finishSession(s2.id);
    }
    expect(seen).toBeGreaterThanOrEqual(2);
  });
});

describe('journey: intermediate learner', () => {
  it('passes foundational questions and receives harder material', async () => {
    const c = clock();
    const svc = await makeService(dbFile(), c);
    let view = await svc.beginPlacement('intermediate');
    // Answer everything correctly up to N4 difficulty.
    while (!view.finished && view.question) {
      const st = (svc as unknown as { placementState: { current: { answer: string; difficulty: number } } }).placementState;
      const ok = st.current.difficulty <= 4.5;
      await svc.answerPlacement(ok ? st.current.answer : null);
      view = await svc.nextPlacement();
    }
    const result = await svc.finishPlacement();
    expect(result.overallAbility).toBeGreaterThan(3);
    await svc.completeOnboarding({});
    const s = (await svc.startSession('manual', { length: 5 }))!;
    const avg = s.questions.reduce((acc, q) => acc + q.difficulty, 0) / s.questions.length;
    expect(avg).toBeGreaterThan(2);
    expect(s.questions.some((q) => q.skill !== 'hiragana')).toBe(true);
  });
});

describe('pause, snooze and the desktop scheduler', () => {
  it('produces no interruptions while paused', async () => {
    const c = clock();
    const svc = await makeService(dbFile(), c);
    await svc.startAsBeginner();
    await svc.completeOnboarding({});
    await svc.pause('1h');
    for (let m = 0; m < 50; m += 10) {
      c.advance(10 * MINUTE);
      const snap = await svc.getSchedulerSnapshot();
      const d = decideDesktopPrompt({ ...snap, now: c.now(), appStartedAt: c.now() - 3 * HOUR, activeMinutes: 120, targetActiveMinutes: 30, idle: false });
      expect(d.show).toBe(false);
    }
    c.advance(30 * MINUTE);
    const snap = await svc.getSchedulerSnapshot();
    const d = decideDesktopPrompt({ ...snap, now: c.now(), appStartedAt: c.now() - 3 * HOUR, activeMinutes: 120, targetActiveMinutes: 30, idle: false });
    expect(d.show).toBe(true);
    await svc.snooze('rest-of-day');
    const after = await svc.getSchedulerSnapshot();
    expect(decideDesktopPrompt({ ...after, now: c.now(), appStartedAt: 0, activeMinutes: 120, targetActiveMinutes: 30, idle: false }).show).toBe(false);
  });
});

describe('notification rescheduling', () => {
  it('changes the plan when preferences change and stops when disabled', async () => {
    const c = clock();
    const svc = await makeService(dbFile(), c);
    await svc.startAsBeginner();
    await svc.completeOnboarding({ settings: { notificationsEnabled: true, reminderTimes: [12 * 60, 18 * 60] } });
    const s = (await svc.startSession('manual'))!;
    for (const q of s.questions) await svc.answerQuestion(s.id, q.id, answerFor(svc, s.id, q.id));
    await svc.finishSession(s.id);
    const before = await svc.planNotifications();
    expect(before.length).toBeGreaterThan(0);
    await svc.updateSettings({ reminderTimes: [7 * 60 + 15], mobileRemindersPerDay: 1 });
    const after = await svc.planNotifications();
    expect(after).not.toEqual(before);
    await svc.updateSettings({ notificationsEnabled: false });
    expect(await svc.planNotifications()).toEqual([]);
  });
});

describe('timezone changes', () => {
  it('keeps review schedules when the user travels', async () => {
    const c = clock();
    const path = dbFile();
    const svc = await makeService(path, c, 'Asia/Tokyo');
    await svc.startAsBeginner();
    await svc.completeOnboarding({});
    const s = (await svc.startSession('manual'))!;
    const fb = await svc.answerQuestion(s.id, s.questions[0]!.id, answerFor(svc, s.id, s.questions[0]!.id));
    await svc.finishSession(s.id);
    const travelled = await makeService(path, c, 'America/New_York');
    const q = await travelled.getReviewQueue();
    expect(q.find((e) => e.id === s.questions[0]!.itemId)?.nextReviewAt).toBe(fb.nextReviewAt);
    expect((await travelled.getAppState()).profile?.timezone).toBe('America/New_York');
  });
});

describe('data management', () => {
  it('clears local data', async () => {
    const svc = await makeService(dbFile());
    await svc.startAsBeginner();
    await svc.completeOnboarding({});
    await svc.clearAllData();
    const st = await svc.getAppState();
    expect(st.onboarded).toBe(false);
    expect(st.placement).toBeNull();
    expect((await svc.getDashboard()).stats.questionsAnswered).toBe(0);
  });

  it('exports learning history as JSON', async () => {
    const svc = await makeService(dbFile());
    await svc.startAsBeginner();
    const out = JSON.parse(await svc.exportData());
    expect(out.format).toBe('jc-export');
    expect(out.placements).toHaveLength(1);
  });

  it('reports migration failures instead of corrupting data', async () => {
    const path = dbFile();
    const raw = new DatabaseSync(path);
    raw.exec('PRAGMA user_version = 99');
    raw.close();
    const svc = new TutorService({ store: new SqliteTutorStore(new NodeSqliteDriver(path)), platform: 'desktop' });
    await expect(svc.init()).rejects.toBeInstanceOf(MigrationError);
  });
});

describe('sync between devices', () => {
  let url = '';
  let api: ReturnType<typeof createApi>;
  beforeAll(async () => {
    api = createApi({ dbPath: join(dir, 'server.db') });
    await new Promise<void>((r) => api.server.listen(0, '127.0.0.1', () => r()));
    url = `http://127.0.0.1:${(api.server.address() as AddressInfo).port}`;
  });
  afterAll(() => api.close());

  it('learns offline on one device, then syncs to another without losing attempts', async () => {
    const c = clock();
    const desk = await makeService(dbFile(), c);
    await desk.updateSettings({ syncServerUrl: url });
    await desk.startAsBeginner();
    await desk.completeOnboarding({ settings: { dailyGoalQuestions: 15 } });
    // Offline: sync disabled, learning continues.
    for (let i = 0; i < 2; i++) {
      const s = (await desk.startSession('manual'))!;
      for (const q of s.questions) await desk.answerQuestion(s.id, q.id, answerFor(desk, s.id, q.id), 2500);
      await desk.finishSession(s.id);
      c.advance(30 * MINUTE);
    }
    expect((await desk.getSyncStatus()).pending).toBeGreaterThan(0);
    // Connectivity returns: create an account; local progress is preserved and uploaded.
    const st = await desk.createAccount();
    expect(st.lastError).toBeUndefined();
    expect(st.pending).toBe(0);
    const { code } = await desk.getLinkCode();

    const phone = await makeService(dbFile(), c);
    await phone.updateSettings({ syncServerUrl: url });
    const linked = await phone.linkWithCode(code);
    expect(linked.lastError).toBeUndefined();
    const deskQueue = await desk.getLibrary({ type: 'all', status: 'introduced' });
    const phoneQueue = await phone.getLibrary({ type: 'all', status: 'introduced' });
    expect(phoneQueue.map((e) => [e.id, e.status, e.nextReviewAt])).toEqual(deskQueue.map((e) => [e.id, e.status, e.nextReviewAt]));
    expect((await phone.getAppState()).settings.dailyGoalQuestions).toBe(15);
    expect((await phone.getAppState()).character.xp).toBe((await desk.getAppState()).character.xp);

    // The phone learns too; the desktop picks it up. Retrying a sync is harmless.
    c.advance(DAY);
    const ps = (await phone.startSession('notification'))!;
    for (const q of ps.questions) await phone.answerQuestion(ps.id, q.id, 'wrong', 4000);
    await phone.finishSession(ps.id);
    await phone.syncNow();
    await phone.syncNow();
    await desk.syncNow();
    const deskDash = await desk.getDashboard();
    const phoneDash = await phone.getDashboard();
    expect(deskDash.stats.questionsAnswered).toBe(phoneDash.stats.questionsAnswered);
  });

  it('resolves conflicting settings by the newest change', async () => {
    const c = clock();
    const a = await makeService(dbFile(), c);
    await a.updateSettings({ syncServerUrl: url });
    await a.createAccount();
    const { code } = await a.getLinkCode();
    const b = await makeService(dbFile(), c);
    await b.updateSettings({ syncServerUrl: url });
    await b.linkWithCode(code);
    await a.updateSettings({ sessionLength: 4 });
    c.advance(MINUTE);
    await b.updateSettings({ sessionLength: 5 });
    await a.syncNow();
    await b.syncNow();
    await a.syncNow();
    expect((await a.getAppState()).settings.sessionLength).toBe(5);
    expect((await b.getAppState()).settings.sessionLength).toBe(5);
  });

  it('deletes the account and its server-side data', async () => {
    const svc = await makeService(dbFile());
    await svc.updateSettings({ syncServerUrl: url });
    await svc.startAsBeginner();
    await svc.createAccount();
    const userId = (api.db.prepare('SELECT user_id FROM tokens ORDER BY created_at DESC LIMIT 1').get() as { user_id: string }).user_id;
    expect((api.db.prepare('SELECT COUNT(*) n FROM events WHERE user_id = ?').get(userId) as { n: number }).n).toBeGreaterThan(0);
    const st = await svc.deleteAccount();
    expect(st.linked).toBe(false);
    expect((api.db.prepare('SELECT COUNT(*) n FROM events WHERE user_id = ?').get(userId) as { n: number }).n).toBe(0);
  });

  it('keeps working when the server is unreachable', async () => {
    const svc = await makeService(dbFile());
    await svc.updateSettings({ syncServerUrl: 'http://127.0.0.1:1' });
    await expect(svc.createAccount()).rejects.toThrow(/unreachable|timed out/i);
    await svc.startAsBeginner();
    expect(await svc.startSession('manual')).not.toBeNull();
  });
});

describe('extra practice vs scheduled check-ins', () => {
  it('sessions started by clicking Mocchi do not use up check-ins', async () => {
    const c = clock();
    const svc = await makeService(dbFile(), c);
    await svc.startAsBeginner();
    await svc.completeOnboarding({ settings: { dailyGoalQuestions: 5, maxDailyInterruptions: 1 } });
    // Lots of self-started practice, past the daily goal.
    for (let i = 0; i < 3; i++) {
      const s = (await svc.startSession('manual'))!;
      for (const q of s.questions) await svc.answerQuestion(s.id, q.id, answerFor(svc, s.id, q.id));
      await svc.finishSession(s.id);
      c.advance(5 * MINUTE);
    }
    const snap = await svc.getSchedulerSnapshot();
    expect(snap.questionsToday).toBeGreaterThanOrEqual(5);
    expect(snap.promptedQuestionsToday).toBe(0);
    expect(snap.promptsToday).toBe(0);
    expect(snap.lastPromptAt).toBeNull();
    const d = decideDesktopPrompt({ ...snap, questionsToday: snap.promptedQuestionsToday, now: c.now(), appStartedAt: c.now() - 3 * HOUR, activeMinutes: 60, targetActiveMinutes: 30, idle: false });
    expect(d.show).toBe(true);

    // A scheduled check-in does count.
    await svc.recordPrompt();
    const s = (await svc.startSession('scheduled'))!;
    for (const q of s.questions) await svc.answerQuestion(s.id, q.id, answerFor(svc, s.id, q.id));
    await svc.finishSession(s.id);
    const after = await svc.getSchedulerSnapshot();
    expect(after.promptedQuestionsToday).toBe(s.questions.length);
    expect(after.promptsToday).toBe(1);
    expect(decideDesktopPrompt({ ...after, questionsToday: after.promptedQuestionsToday, now: c.now() + HOUR, appStartedAt: 0, activeMinutes: 60, targetActiveMinutes: 30, idle: false }).show).toBe(false);
  });
});

describe('reading reveals in sessions', () => {
  it('count against kanji, explain wrong answers, and survive a restart', async () => {
    const c = clock();
    const path = dbFile();
    const svc = await makeService(path, c);
    let view = await svc.beginPlacement('intermediate');
    while (!view.finished && view.question) {
      const cur = (svc as unknown as { placementState: { current: { answer: string; difficulty: number } } }).placementState.current;
      await svc.answerPlacement(cur.difficulty <= 4 ? cur.answer : null);
      view = await svc.nextPlacement();
    }
    await svc.finishPlacement();
    await svc.completeOnboarding({});
    const kanji = async (s: TutorService) => (await s.getDashboard()).stats.skills.find((x) => x.skill === 'kanji')!.ability;
    let kanjiBefore = 0;
    let kanjiAfter = 0;
    let revealedOne = false;
    for (let round = 0; round < 8 && !revealedOne; round++) {
      const s = (await svc.startSession('manual', { length: 5 }))!;
      for (const q of s.questions) {
        if (q.kanjiDifficulty !== undefined && !revealedOne) {
          kanjiBefore = await kanji(svc);
          const fb = await svc.answerQuestion(s.id, q.id, 'definitely wrong', 3000, { readingShown: true });
          kanjiAfter = await kanji(svc);
          expect(fb.note).toMatch(/kanji/);
          expect(fb.whyWrong).toBeTruthy();
          revealedOne = true;
        } else await svc.answerQuestion(s.id, q.id, answerFor(svc, s.id, q.id));
      }
      await svc.finishSession(s.id);
      c.advance(HOUR);
    }
    expect(revealedOne).toBe(true);
    expect(kanjiAfter).toBeLessThan(kanjiBefore);
    const restarted = await makeService(path, c);
    const attempts = JSON.parse(await restarted.exportData()).attempts as Array<{ readingShown?: boolean }>;
    expect(attempts.some((a) => a.readingShown)).toBe(true);
  });
});
