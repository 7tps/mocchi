# Implementation plan and status

Last updated: 2026-10-26.

## Environment findings

- Windows 11, Node 24.20, npm 11. No Android SDK, Java, Xcode or Docker on the build machine.
- Electron 45 ships Node 24.22 with a working built-in `node:sqlite`, so desktop, the sync server and the tests share one SQLite layer with **no native modules to rebuild**.
- Expo SDK 58 (React Native 0.88, React 19.3). Desktop pins React 19.3.0 too, so the npm workspace hoists a single React.
- TypeScript is pinned to 6.0.3 because typescript-eslint does not yet support TypeScript 7.

## Phases

| Phase | Status | Notes |
| --- | --- | --- |
| 1. Foundation (monorepo, types, schema, engine, content) | Done | npm workspaces; packages consumed as TS source by Vite, Metro, Vitest and tsx. |
| 2. Learning experience (placement, questions, SRS, sessions, persistence, dashboard) | Done | Placement uses a Bayesian ability grid per skill with a guessing-aware 3PL model. |
| 3. Desktop (widget, pop-up, scheduler, tray, settings, startup, packaging config) | Done | Verified by launching the built app and driving it over the DevTools protocol. |
| 4. Mobile (onboarding, sessions, local notifications, dashboard, offline storage) | Implemented, bundled for Android and iOS | Not yet run on a device or emulator (no SDKs on the build machine). |
| 5. Character and visual polish (sprites, moods, reactions, cosmetics, reduced motion) | Done | 11 moods, 8 cosmetics, generated from one sprite model. |
| 6. Sync and reliability (accounts, sync, conflicts, export, deletion) | Done | Self-hosted Node sync server; tested end to end in-process. |
| 7. Release preparation | Partly done | electron-builder config, icons, docs. Signing and store submission need your certificates/accounts. |

## What is implemented

**Learning engine** (`packages/learning-engine`)
- SM-2-based scheduler with learning/relearning steps, ease, lapse handling, deterministic fuzz, late-review credit, retrievability estimate, and a "retained" status that requires several growing intervals (never "mastered forever").
- Per-skill ability estimates (11 skills) updated after each answer, with step sizes that shrink with evidence and a cap per answer.
- Question generation for 15 formats: ja→en, en→ja, kana↔romaji, reading, kanji meaning, kanji reading in context, particle and grammar fill-in, choose the correct sentence, arrange words, sentence translation, reading comprehension, conjugation, listening (when a Japanese TTS voice exists). Distractors never share a meaning with the answer; kana distractors favour look-alikes.
- Answer validation against explicit accepted-answer lists: English normalisation (articles, "to", case, punctuation), typo tolerance only for longer words, Japanese NFKC normalisation, romaji→kana input, script-difference notes. No substring matching.
- Session composer: due reviews first (urgency, forgetting, recent misses, importance), a configurable trickle of new items near the learner's ability, an occasional weakest-skill question, skill/format variety, script gating (no kanji quizzes before hiragana), "assumed known" skipping, and a reason string for every question.
- Adaptive placement exam (20–40 questions) across 9 categories, "I don't know" option, kana gating, JLPT-aligned band only as an approximation, strengths/weaknesses, known/unknown kana, recommended difficulty. Retakes supported.
- Interruption policy for desktop (pause, snooze, quiet hours across midnight, daily goal, daily cap, minimum gap, start-up grace, active-minute target, idle detection, "nothing useful to do") and notification planning for mobile (quiet hours, pause, preferred times, categories, nothing-useful suppression, OS cap, dedupe). Every decision carries a reason.
- Progression: XP that rewards the first session of the day and streaks with a soft daily cap; levels; milestone and streak/level cosmetic unlocks that are never revoked.
- Event-log replay that rebuilds progress and skills deterministically (used by sync).

**App layer** (`packages/app-core`): `TutorService` with onboarding, placement, sessions, settings (with per-field HLC stamps), pause/snooze, library, review queue, cosmetics, export, local data deletion, sync account creation, device linking via short codes, sync, and account deletion. One SQLite schema with versioned migrations for desktop, mobile and tests.

**Desktop**: frameless transparent character window (drag, click → quiz, double-click → app, right-click → menu, due badge, mood reactions, speech bubble on prompts), always-on-top quiz pop-up shown with `showInactive()` unless the user enables focus, snooze menu, Esc/✕ always close it, remembered positions clamped to the current monitors, tray menu with pause/resume, main window (onboarding, home, learn, progress, library, review queue, character, settings, about/data), launch at login, native notifications, single-instance lock, OS-keychain storage of the sync token, synthesized sound effects, TTS listening detection.

**Mobile**: Expo Router app with onboarding (permission requested after explaining it), tabs (Home, Progress, Library, Settings), session modal, review queue, character, notification settings (times, categories, quiet hours, upcoming reminders, denied-permission recovery), account/sync/privacy/export/delete, haptics, expo-speech listening, sprite-sheet character. Notifications are rescheduled after every change and on returning to the foreground; tapping one (also from a cold start) opens a session.

**Sync server**: anonymous accounts, hashed bearer tokens, single-use link codes, append-only idempotent event log, paged pull with cursors, export, cascading account deletion, request validation, no request-body logging.

## Changes after first review (2026-10-26)

- **Placement exam in the corner.** On desktop, after the short intro the main window steps aside and the exam runs in the compact quiz pop-up beside the corner character. Closing it saves progress (clicking Mocchi resumes); when it ends, the main window returns with the full results. Retakes from Settings use the same pop-up.
- **Extra practice is free.** Sessions started by clicking Mocchi (or from the tray/app) are labelled “Extra practice” and never use up scheduled check-ins: they don’t count toward the daily interruption limit, don’t reset the spacing timer or activity cycle, and don’t stop scheduled check-ins once the daily goal is met (only prompted sessions count for that). They still earn XP and count toward progress and the daily goal meter. The same rule applies to mobile reminders.
- **Why the wrong answer is wrong.** Feedback now explains the learner’s specific wrong answer as well as the right one:
  - Vocabulary, kanji and translation options name the word or sentence they actually belong to.
  - Kana options point out look-alikes.
  - Conjugation mistakes name the rule that was broken. This works for kanji, kana and romaji input.
  - Particle mistakes describe what that particle does.
  - About 140 hand-written notes cover grammar distractors; a test enforces that every grammar and particle distractor has one.
  - Typed answers are matched against other words, with a near-miss check.
  - While writing the notes, four distractors turned out to be arguably correct and were replaced: 見てます, 飲みましょうか, 静かでない and 静かでした.
- **Kanji are measured separately.** Every question records the difficulty of the hardest kanji it depends on. Readings start hidden on kanji prompts. Revealing one (“Show reading — counts as kanji practice”) applies a kanji-skill miss and still scores the tested skill fairly.
  - In the exam, questions without a reading offer “I can’t read the kanji”: it counts against kanji only and is shown as “Skipped — kanji”.
  - A skill blocked twice this way is reported as “not measured” rather than scored low.
  - Reveals are stored on attempts, so sync replay reproduces the same kanji estimate on every device.

## Verification performed

- `npm run lint`: clean.
- `npm run typecheck`: all 9 workspaces pass (including desktop and mobile).
- `npm test`: 112 tests pass. Coverage includes:
  - unit tests for the content, engine and desktop geometry/activity modules
  - 14 integration journeys covering the beginner and intermediate journeys, a repeatedly missed item returning, pause, notification rescheduling, a timezone change, restart persistence, export, local deletion, migration failure, offline learning then sync to a second device, settings conflicts, account deletion, and an unreachable server.
- Desktop: built with electron-vite and launched with an isolated profile. Driven over the Chrome DevTools Protocol through onboarding → placement exam (28 adaptive questions) → results → dashboard. Relaunched to confirm onboarding and progress persisted; the widget and quiz pop-up opened, a session completed with XP and a milestone, and the pop-up closed cleanly.
- Mobile: `expo export` produced Hermes bundles for Android and iOS (all workspace packages and sprite assets resolved).
- Browser preview of the renderer checked in night and paper themes with no console errors.

## Known limitations and trade-offs

- **Mobile not run on a device here.** Notification delivery, tap routing and the Japanese keyboard path are implemented against the Expo SDK 58 APIs and type-checked/bundled, but need a device test (see docs/release.md).
- **Sync server instead of Supabase.** A small Node + SQLite service was chosen because it runs locally with no Docker or cloud account and is fully tested. The storage is a single file; for multi-user production, put it behind HTTPS and back it up, or port the four tables to Postgres. There is no rate limiting yet.
- **Activity minutes reset on restart.** The desktop scheduler's active-minute counter lives in memory; prompt history, last prompt time, pause and snooze persist.
- **Always-on-top vs. full-screen apps.** The pop-up uses the `pop-up-menu` level on Windows and `floating` on macOS; exclusive full-screen games may still cover it. On macOS the character is hidden over full-screen spaces by design.
- **Linux**: transparent windows need a compositor; tray support depends on the desktop environment.
- **Listening questions** require an OS Japanese text-to-speech voice; without one they are disabled rather than broken. No recorded audio ships yet.
- **Content ceiling**: the curriculum is strongest for N5–N4 with a smaller N3 set and a few N2/N1 placement probes, so placement above N3 is less precise (the UI shows "≈").
- **Character art** is generated procedurally from one sprite model; hand-drawn sheets can replace the PNGs without code changes (docs/character.md).

## Next steps

1. Run the mobile app on Android and iOS devices; verify notification timing, tap routing and the Japanese keyboard.
2. Code signing for Windows/macOS; Play/App Store listings.
3. Recorded audio for listening; import an openly licensed dictionary pack via `importContentPack` (attribution is preserved per item).
4. Rate limiting and Postgres storage for a hosted sync server.
