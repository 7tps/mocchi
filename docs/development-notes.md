# Development notes

Working notes for continuing development. Architecture: `docs/architecture.md`. Status and next task: `docs/implementation-plan.md`.

## Key technical decisions

| Decision | Why |
| --- | --- |
| `node:sqlite` (built in) instead of better-sqlite3 | Electron 45 bundles Node 24.22, where `node:sqlite` works, so no native rebuilds. The same `SqliteTutorStore` runs on desktop, in tests and (via `ExpoSqliteDriver`) on mobile. |
| One `TutorService` for all platforms | Desktop runs it in the main process (renderers use IPC with an allowlist). Mobile and the browser preview run it in-process. |
| Event-sourced learning history + replay | Attempts, sessions and placements are append-only with UUIDv7 ids. Progress, skills and character are derived, so sync never overwrites newer progress. Settings use per-field LWW with HLC stamps. |
| Self-hosted Node sync server instead of Supabase | Runs locally without Docker or a cloud account, and is fully testable in-process. Trade-off: single SQLite file, no rate limiting. |
| Placement = Bayesian grid posterior per skill (3PL with guessing) | Accounts for difficulty and multiple-choice guessing, not just the number correct. Kana are excluded from the overall estimate (their items top out near N5) and act as a gate instead. |
| Skill update step capped at ±0.6, ability floored at 0 | The first version moved a beginner from 0.2 to −1.0 after one miss. |
| Procedural sprites (`design-system/src/sprites.ts`) | Keeps one consistent grid and palette across 11 moods × 8 cosmetics. Desktop draws from the model on a canvas; mobile uses exported 8× PNG sheets through a generated `require()` map. |
| Reading reveal stored on the attempt (`readingShown`, `kanjiDifficulty`) | So replay and sync reproduce the kanji penalty on every device. |
| JLPT content from open datasets, grammar by hand | Nobody can hand-write ≈8,000 words and ≈2,200 kanji; JMdict, KANJIDIC2 and Tatoeba are the standard open sources. No open grammar dataset of usable quality and licence exists, so grammar is written here. User's choice (2026-10-27). |
| N5 inside the installer, N4–N1 downloaded | User's choice. Size isn't the reason (the packs total 1.3 MB). It keeps the installer's level choice meaningful and lets content update without an app release. |
| Level choice is cumulative ("up to N3") | User's choice; higher levels build on lower ones. |
| Native ids in packs (`v:`, `k:`) instead of `x:` prefixes | `kanjiLoad` looks kanji up by `k:<char>`, and stable ids keep progress valid if an item later moves into the bundle. |
| Trust packs by SHA-256 against the bundled manifest | Skips per-item zod validation at start-up (packs are validated at build time) and rejects truncated or tampered downloads. |
| kuromoji (IPADIC) for readings at build time | Validation requires kana readings for examples, and Tatoeba sentences have none. Tokens of the target word use its dictionary reading. |
| Extra practice excluded from check-in counters | User requirement. Only `scheduled`/`notification` sessions count (`promptedQuestionsToday`). Finishing a session no longer resets the desktop activity cycle; only a prompt does. |
| Wrong-answer notes generated at question build time (`Question.choiceNotes`) | The engine knows which item each distractor came from. Notes are stripped from the UI copy by `publicQuestion()` and returned as `Feedback.whyWrong`. |

## Failed approaches and fixes worth remembering

- Running `electron-vite build` from the repo root fails ("entry point is required") because it doesn't find the config. Use `npm run build -w @jc/desktop`.
- `vitest.config.ts` warned about ESM loaded as CommonJS until the root `package.json` got `"type": "module"`. ESLint config is `eslint.config.mjs`.
- Inline `node -e '...'` patches broke on quoting in Git Bash. Patch scripts written to a file worked reliably.
- Tool input normalises `\uXXXX` escapes into literal characters. A literal ideographic space in a regex failed ESLint `no-irregular-whitespace`; it was removed, since `\s` already matches U+3000.
- `frameToRgba` needed the return type `Uint8ClampedArray<ArrayBuffer>` to satisfy the `ImageData` constructor under TS 6.
- `app.setLoginItemSettings({ openAsHidden })` no longer exists in Electron 45's types; removed.
- The tray icon generator crashed on 16 px output (smaller than the 32 px sprite); it now downsamples with nearest neighbour.
- Content data errors caught by tests: too few conjugation distractors for some verbs, and grammar/conjugation distractors that were actually valid Japanese: 見てます, 飲みましょうか, 静かでない, 静かでした. All replaced.
- An integration test measuring the kanji estimate over a whole session was confounded by other correct kanji answers. It now measures immediately around the reveal.

- Pack build: jmdict-simplified example sentences use the key `lang`; a typo (`land`) produced 0 examples.
- JLPT list rows need normalising before lookup: "(する)" suffixes, "(かん)", "〜を", alternatives after "、" or "/", swapped expression and reading, and trailing な/と.
- Bash heredocs whose body contains JS template literals sometimes fail with "unexpected EOF". Write patch scripts with the Write tool, or use the Edit tool directly.
- PowerShell `Set-Content` re-encoded `prepare-content.mjs` (added a BOM and garbled non-ASCII); fixed with sed.
- Kuromoji couldn't read a lone 踏 before ＿＿, and "…" isn't allowed in readings. The build lists such prompts ("No automatic reading") and fails.
- Proofreading the level grammar found about 25 distractors that were arguably correct (e.g. 忘れないために, ドアを開けてあります, 社長たるもの, 人を泣かせてやまない); all were replaced. Prefer distractors that are wrong in *form*.

- Character drifted while dragged/held, and couldn't reach screen edges (fixed 2026-10-27). At 125 % scaling, `setPosition` on the frameless widget rounds outward and grows the window a little on every move (it was even created at 135×151 instead of 132×148), so the bottom-centred sprite crept. Dragging now uses `setBounds` with the fixed size, and saved sizes are ignored. Clamping used the whole window, transparent margins included; `placeWidget` (geometry.ts) now clamps the visible sprite pixels and snaps within 16 px of an edge. Verified by simulating a drag on an isolated instance: size stays 132×148, no movement while held, sprite lands exactly in the corner.
- Due badge wouldn't clear (fixed 2026-10-27). Items left unanswered when a pop-up closed were kept out of *all* sessions for 2 hours, and every new dismissal refreshed one shared timestamp, so they could stay blocked indefinitely while the badge still counted them. Each item now expires on its own after 30 minutes, and only check-ins skip them.

## Known issues / open bugs

- Release `content-2026.10.1` is not published, so the release installer's N4–N1 downloads fail. This is handled: setup shows a message and the app retries. The interactive installer page hasn't been seen.
- Example readings from kuromoji can be wrong. JMdict glosses can be terse, or list a less common sense second.
- `typedMeaningNotes`/`typedJapaneseNotes` now scan about 10,000 items per typed question. That is still fast (≈0.2 ms per answer), but builds a large notes map in memory for each typed question.
- None failing in tests. Behaviours not yet verified live:
  - A scheduled pop-up firing on its own. It needs real user activity, because idle time ≥ 120 s pauses the active-minute counter.
  - Everything on mobile devices.
- Activity minutes reset when the desktop app restarts (in memory only).
- The "Strengths" rule (ability ≥ overall + 0.4, ability ≥ 1, ≥ 50 % correct) can still list a skill with 1/2 correct.
- `typedMeaningNotes`/`typedJapaneseNotes` scan the whole library for each typed question. That's fine at ~850 items, but would need an index if a large dictionary pack is imported.
- Mobile route files must only default-export a screen. Shared pieces live in `apps/mobile/src/components` (`Placement.tsx`, `EntryRow.tsx`, `Quiz.tsx`).

## Test results (2026-10-27)

`npm run check` passes: ESLint clean, `tsc` in 10 workspaces, Vitest 124/124 (content 37, engine 60, desktop main 11, integration 16). `npm run content:build` validates every pack item with zero issues. `npm run package:win` builds the installer (127 MB). `expo export --platform android` builds a 4.1 MB Hermes bundle; iOS bundled before the review changes.

## Manual verification technique (desktop)

Launch the built app with remote debugging and an isolated profile:

```bash
MOCCHI_USER_DATA=<scratch dir> npx electron . --remote-debugging-port=9333
```

Run that inside `apps/desktop` after `npm run desktop:build`. A small Node script (not committed) then:

1. Reads `http://127.0.0.1:9333/json/list`.
2. Connects to a window's `webSocketDebuggerUrl` with the built-in `WebSocket`.
3. Uses `Runtime.evaluate` to click buttons and read text, and `Page.captureScreenshot` for PNGs.

Windows are told apart by URL hash: `#/main`, `#/widget`, `#/quiz?...`. From the widget page, `window.desktop.openQuiz('manual')` / `window.desktop.openPlacement()` open the pop-up, and `window.desktop.onScheduler(cb)` reports the scheduler's latest decision and reason.
