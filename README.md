# Mocchi — a pixel-art Japanese companion

Mocchi is a small pixel-art mochi spirit that lives on your desktop and phone and offers short (30 s – 3 min) Japanese quizzes while you go about your day. A placement exam sets your starting point; a spaced-repetition engine with per-skill ability estimates decides what to ask next.

- **Desktop** (Electron): a draggable always-on-top character, a compact quiz pop-up that appears without stealing focus (the placement exam runs there too), tray menu, dashboard, library, settings. Click Mocchi any time for extra practice; it never uses up scheduled check-ins.
- **Mobile** (Expo / React Native, iOS + Android): home dashboard, sessions, local reminder notifications that open a session when tapped.
- **Shared engine**: placement exam, SM-2-style scheduling, adaptive session composition, answer validation, interruption policy, progression — one TypeScript codebase used by both apps.
- **Offline-first**: everything works without a network. Optional sync through a small self-hosted server (`services/api`).
- **No AI API or subscription** needed: 400+ words, 150 kanji, 37 grammar patterns, 12 particle sets, 196 kana, conjugation drills, expressions and reading passages ship with the app.

## Repository layout

```
apps/desktop          Electron main + preload + React renderer (widget, quiz pop-up, main window)
apps/mobile           Expo Router app
packages/shared-types Domain model (UserProfile, LearningItem, LearningProgress, QuizAttempt, …)
packages/shared-utils Timezone-aware time, kana/romaji, answer normalisation, seeded RNG, HLC clock
packages/japanese-content  Curriculum data, conjugation engine, content validation and pack import
packages/learning-engine   SRS, ability model, questions, answers, sessions, placement, scheduler, progression, stats, replay
packages/design-system     Colour tokens, i18n strings, the Mocchi sprite generator
packages/app-core          TutorService (the app's brain), SQLite store + migrations, sync client
services/api               Sync server (Node http + node:sqlite)
assets/character, assets/ui  Generated sprite sheets, cosmetics, icons
scripts/                   Sprite/PNG generation
tests/                     End-to-end integration tests (real SQLite + real sync server)
docs/                      Plan, architecture, character, privacy, release notes
```

## Requirements

- Node.js **24.x** (≥ 22.13 works; `node:sqlite` is required) and npm 11.
- Desktop: Windows 10/11 or macOS 12+ (Linux works for development; see limitations).
- Mobile: a development build needs Android Studio (Android SDK, JDK 17) and/or Xcode on macOS. Expo Go is **not** enough because the app uses native modules (SQLite, notifications, secure storage).

## Install

```bash
npm install
```

## Run

Desktop app (Electron, hot reload):

```bash
npm run desktop
```

Desktop renderer in a normal browser (the service runs in-page with localStorage; no overlay/tray):

```bash
npm run desktop:web
```

Sync server (optional, defaults to http://127.0.0.1:8787):

```bash
npm run api
```

Mobile (Metro dev server; then press `a` / `i`, or use a development build):

```bash
npm run mobile
```

```bash
npm run android -w @jc/mobile
```

```bash
npm run ios -w @jc/mobile
```

Regenerate the character sprite sheets and icons after editing `packages/design-system/src/sprites.ts`:

```bash
npm run sprites
```

## Check

```bash
npm run check
```

That runs ESLint, TypeScript for every workspace, and the Vitest suite (unit + integration). Individually: `npm run lint`, `npm run typecheck`, `npm test`.

Bundle the mobile app without a device (verifies Metro resolution and Hermes compilation):

```bash
npm run bundle:android -w @jc/mobile
```

## Build installers

```bash
npm run package:win -w @jc/desktop
```

```bash
npm run package:mac -w @jc/desktop
```

See [docs/release.md](docs/release.md) for signing, notarisation and store requirements.

## Useful environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `MOCCHI_USER_DATA` | desktop | Use a separate profile folder (testing). |
| `MOCCHI_SCHEDULER_DEBUG=1` | desktop | 5 s scheduler tick, no start-up grace, 30 s activity target — to see pop-ups quickly. Your interval/quiet-hour/limit settings still apply. |
| `PORT`, `HOST`, `DB_PATH`, `CORS_ORIGIN` | services/api | See `services/api/.env.example`. |

## Status

See [docs/implementation-plan.md](docs/implementation-plan.md) for what is implemented, what is tested, and known limitations.

## Licences

Code and the curated curriculum: MIT. Pixel font DotGothic16: SIL Open Font License 1.1. JLPT levels shown in the app are approximate and unofficial.
