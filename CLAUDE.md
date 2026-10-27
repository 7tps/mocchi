# CLAUDE.md — Mocchi (Japanese companion)

Pixel-art Japanese tutor: Electron desktop companion + Expo mobile app + shared TypeScript learning engine + optional self-hosted sync server. Status and next task: `docs/implementation-plan.md`. Bugs, decisions, failed approaches: `docs/development-notes.md`.

## Layout (npm workspaces, packages consumed as TS source — no build step)

| Path | Role |
| --- | --- |
| `packages/shared-types` | Domain model (LearningItem, LearningProgress, QuizAttempt, Question, AnswerMeta, SyncEvent…). |
| `packages/shared-utils` | Intl-based timezone helpers, kana/romaji, answer normalisation, seeded RNG, UUIDv7, hybrid logical clock. |
| `packages/japanese-content` | Curated curriculum (`src/data/*`), conjugation engine + `conjugationMistakes`, `why-not.ts` wrong-answer notes, zod validation, `importContentPack`. JLPT level packs: `packs.ts` (types, `CONTENT_PACK_VERSION`, `parseLevelPack`, `libraryWithPacks`) and hand-written level grammar/readings in `src/levels/`. |
| `packages/learning-engine` | Pure, deterministic: SRS (`srs.ts`), ability model, `questions.ts`, `answers.ts` (`checkAnswer`, `explainWrong`), `session.ts`, `placement.ts`, `scheduler.ts`, progression, stats, `replay.ts`. |
| `packages/design-system` | Colour tokens, `i18n.ts` (all UI strings), procedural sprite model `sprites.ts`, cosmetics/lines. |
| `packages/app-core` | `TutorService` (the app brain), `TutorApi`/view types (`api.ts`), SQLite store + `MIGRATIONS`, memory store, sync client. `@jc/app-core/node-sqlite` is a separate entry (Node only). |
| `services/api` | Sync server: `node:http` + `node:sqlite` + zod. |
| `apps/desktop` | Electron: `src/main` (windows, scheduler adapter, tray, IPC allowlist), `src/preload`, `src/renderer` (React; routes `#/widget`, `#/quiz`, `#/main/...`). |
| `apps/mobile` | Expo SDK 58 + Expo Router. `app/` = routes only; shared UI in `src/components`. |
| `tests/` | Integration tests (real SQLite file + real sync server on a random port). |
| `tools/content` | Build-time only: fetches pinned datasets (`sources.ts`) into `.cache/datasets`, builds `dist/content/jlpt-n5…n1.json.gz` + `manifest.json` (kuromoji for readings). |
| `apps/desktop/installer` | NSIS additions (`installer.nsh`: "Study content" page, pack downloads, `/LEVEL=`); `levels.generated.nsh` is written by `scripts/prepare-content.mjs`. |

## Commands

```bash
npm install
npm run check                    # eslint + tsc for every workspace + vitest (must pass before finishing work)
npm test                         # vitest only
npm run desktop                  # Electron dev (electron-vite, HMR)
npm run desktop:build            # build to apps/desktop/out
npm run desktop:web              # renderer in a browser on :5199 (service runs in-page, localStorage)
npm run api                      # sync server on 127.0.0.1:8787
npm run mobile                   # Expo dev server (native dev build needed; Expo Go is not enough)
npm run bundle:android -w @jc/mobile   # Metro/Hermes bundle check without a device
npm run sprites                  # regenerate assets/character, assets/ui, apps/mobile/src/sprites.generated.ts
npm run content:fetch            # download pinned datasets to .cache/datasets (once)
npm run content:build            # build dist/content level packs + manifest (fails on any validation issue)
npm run package:win              # content:fetch + content:build + Windows installer (apps/desktop/release)
```

Run electron-vite only via the workspace scripts (running it from the repo root fails to find the config). Run a built app with an isolated profile: `MOCCHI_USER_DATA=<dir> npx electron .` inside `apps/desktop`; add `MOCCHI_SCHEDULER_DEBUG=1` for fast scheduler ticks.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`; string-literal unions, no enums. Extensionless relative imports (bundler resolution).
- Shared packages must stay platform-neutral: no `node:` or DOM imports outside `app-core/src/node-sqlite.ts`, tests and apps.
- The engine is deterministic: randomness only via `createRng(seed)`. Every scheduling/selection decision carries a human-readable `reason`.
- All user-facing strings go in `packages/design-system/src/i18n.ts` and are read with `t(key, vars)`.
- Answers are validated only against explicit accepted lists — never substring matching.
- Questions sent to UIs go through `publicQuestion()` (strips answer, accepted, explanation, example, choiceNotes).
- Desktop renderer calls the service only through `api` (`bridge.ts`); new service methods must be added to `ALLOWED` in `apps/desktop/src/main/index.ts`, the `TutorApi` interface, and (for desktop-only actions) `preload/index.ts` + `DesktopBridge`.
- Learning history is append-only (attempts, sessions, placements); progress/skills/character are derived and rebuilt by `replayAttempts` after sync. Anything that changes skill estimates must be stored on the attempt so replay reproduces it (e.g. `readingShown`, `kanjiDifficulty`).
- Schema changes: append to `MIGRATIONS` in `packages/app-core/src/sqlite-store.ts`; never edit an applied migration.
- New grammar/particle distractors need a note in `japanese-content/src/data/why-not.ts` (a test enforces it). Distractors must be unambiguously wrong.
- Level packs: item ids are native (`v:`, `k:`, `g:`, `r:`) and must not collide with the bundled curriculum (the build fails). Level grammar puts its "why not" notes inline (`distractorNotes`, via the `fill`/`choose`/`ask` helpers); readings are generated at build time, so prompts must be readable by kuromoji (no "…", no lone kanji before ＿＿). Changing pack contents → bump `CONTENT_PACK_VERSION`.
- Desktop loads packs through `ContentManager` (`apps/desktop/src/main/content.ts`, no Electron imports): only packs whose SHA-256 matches the bundled manifest are used; `TutorService.replaceLibrary` swaps the library when packs change. Verbs tagged `irregular-conjugation` are excluded from conjugation drills.
- Pinned versions (exact). React 19.3.0 everywhere (Expo SDK 58 requirement; avoids duplicate React). TypeScript 6.0.3 (typescript-eslint doesn't support TS 7).

## Product rules that are easy to break

- Self-started sessions (`manual`, `review`) are "extra practice": they must not affect scheduled check-ins. Only `scheduled`/`notification` sessions count via `promptedQuestionsToday`; `lastPromptAt` comes only from the prompt log.
- Items left unanswered when a pop-up is closed are skipped by *check-ins* for 30 minutes each (`recentDismissed` meta, per-item timestamps); sessions the learner starts always include due reviews, so the widget's due badge can be cleared.
- The character's right-click menu is app-drawn (`#/menu`, `MenuApp.tsx`, its own window sized by `desktop:menu-ready`, closed on blur/Esc/selection); the tray menu stays native. Keep their items in step (`buildMenu` in `main/index.ts`).
- The main window is frameless on Windows/Linux (`hiddenInset` on macOS) with an app-drawn title bar (`components/TitleBar.tsx`, buttons via `desktop:window-control`). Full-height layouts must subtract `--titlebar-h`.
- Desktop check-ins trigger on whichever comes first: the randomised active-minute target, or `checkInEveryHours` (default 3, 0 = off) since the last check-in (or app start). Pause, snooze, quiet hours, the daily cap, the goal and idle still block both.
- Mocchi's resting mood comes from `assessHabit` (engine `habit.ts`, exposed as `AppState.habit`) via `restingMood`: thriving → happy, steady → idle, 1–3 days away → waiting, 3+ days away or ≥2 check-ins closed unfinished since the last finished session → sad. Pause/quiet hours → sleepy. Momentary moods (answers, prompts) override it.
- Skill scores are shown as "X% to NY" (`jlptProgress` in engine `levels.ts`, `levelLabel` in i18n): progress through the next JLPT level not yet mastered. Kana are shown as "% learned"/"Mastered" (mastered at ability 2.6), never on the JLPT ladder.
- Scheduled check-ins ask first: the pop-up opens as a small invite (`INVITE_SIZE`, "Start questions" / "In 15 min" / "Not now") and only grows into the quiz (`desktop:expand-quiz`) and starts a session on Start. Closing the invite calls `declineCheckIn` (counts as a skipped check-in for the mood); snoozing doesn't. Tray, widget click and notification clicks go straight to questions.
- Quiz pop-up appears with `showInactive()` unless `popupTakesFocus`; it must always be closable (✕, Esc, snooze).
- Placement exam on desktop runs in the corner pop-up (`#/quiz?mode=placement`), not the main window.
- Kanji knowledge is scored separately: reading reveals / "can't read the kanji" penalise only the kanji skill.
- Never claim JLPT levels are official; never collect keystrokes, window titles or screenshots (idle time only).
- Content level = "up to" (N3 installs N5+N4+N3); default N5. Installer choice → `resources/content/selection.json`; later in-app changes → `userData/content/state.json`; a re-install with a different choice wins.
- Level packs carry CC BY-SA 4.0 dictionary data: keep attribution (item `source`, `ATTRIBUTION.txt`, About screen).

## Environment gotchas (Windows dev machine)

- Git Bash rewrites args starting with `/` (e.g. `#/main`) — set `MSYS_NO_PATHCONV=1`.
- PowerShell `Set-Content` re-encodes UTF-8 files (adds a BOM, garbles non-ASCII); edit files with the Edit tool or Node instead.
- NSIS include files must stay ASCII (no em dashes or ellipses).
- `cd` inside a Bash call changes the session's working directory; prefer absolute paths.
- No Android SDK/Java/Xcode/Docker here: mobile can be type-checked and bundled, not run.
- Windows keeps SQLite files locked until the process exits (test cleanup is best-effort).
- Stop test Electron instances by path: processes named `electron` whose path contains `japanese-tutor`.
