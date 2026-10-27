# Architecture

## Layers

```
apps/desktop (Electron main: windows, tray, scheduler adapter, IPC)   apps/mobile (Expo: screens, notifications adapter)
        │  renderer ⇄ preload ⇄ ipcMain (allow-listed methods)                │
        └──────────────────────────── packages/app-core ──────────────────────┘
                     TutorService · SqliteTutorStore (migrations) · SyncClient
                                   │
              packages/learning-engine  ← pure, deterministic, unit tested
                                   │
        packages/japanese-content · packages/shared-utils · packages/shared-types
```

The learning engine decides **what** to review. Platform adapters decide **when and how** to present it: the desktop adapter feeds the shared policy with OS idle time and opens a pop-up or notification; the mobile adapter turns the shared notification plan into local notifications.

On desktop the service runs in the Electron main process and owns the database; the widget, pop-up and main window are thin renderers that call it over IPC and refresh on `tutor:changed` events. On mobile the service runs in-process.

## Data model

All entities are in `packages/shared-types`. Storage (`packages/app-core/src/sqlite-store.ts`):

| Table | Key | Indexed columns | Contents |
| --- | --- | --- | --- |
| `meta` | key | — | profile, settings, character, skills, pause, snooze, device id, HLC, sync cursor, prompt log |
| `learning_progress` | item_id | status, next_review_at | `LearningProgress` (derived cache) |
| `quiz_attempts` | id (UUIDv7) | item_id, answered_at, unsynced | `QuizAttempt` (append-only) |
| `learning_sessions` | id | started_at | `LearningSession` |
| `placement_results` | id | taken_at | `PlacementResult` |

Rows keep the full JSON document plus the columns used for queries, so optional fields can be added without migrations. Schema changes go in `MIGRATIONS` (each runs once in a transaction and bumps `PRAGMA user_version`). A database written by a newer app version is refused with a clear error instead of being modified.

`Device` and `UserProfile` live in `meta`; `CharacterProgress` is derived from sessions (XP) and progress (milestones) so it survives sync.

## Synchronisation

- Attempts, sessions and placements are **append-only events** with stable IDs. The server stores them idempotently (`UNIQUE(user_id, id)`), so retries are harmless.
- Review state is **derived**: after receiving new events a device replays the whole log in a canonical order (`answeredAt`, then HLC, then id). Two devices with the same events compute the same schedule; a stale device cannot overwrite newer progress because there is nothing to overwrite — only events to add.
- Settings use **per-field last-writer-wins** with hybrid logical clock stamps, which tolerate clock skew (a device that has seen a later stamp moves its clock forward; absurd future stamps are clamped). Device-specific settings (start at login, sync URL) never sync.
- Typed answers are not uploaded; attempts sync with an empty response.
- Local-only users keep everything when they create an account: all unsynced rows upload on the first sync.
- Linking another device uses a single-use 8-character code that expires after 15 minutes.

## Scheduling

`decideDesktopPrompt` checks, in order: pause, snooze, quiet hours (timezone-aware, across midnight), daily goal, daily interruption cap, start-up grace (10 min), minimum gap, whether anything useful exists, accumulated active minutes vs. a randomised 30–60 minute target, and whether the user is idle. It returns `{show, reason, nextCheckAt}`.

`planMobileNotifications` produces up to 40 reminders over 7 days at the user's chosen times, skipping quiet hours, pauses, slots with nothing due (unless a streak reminder is enabled) and today if the goal is met.

## Time

All instants are epoch milliseconds. Local calendar concepts (streak days, quiet hours, "today") are computed with an explicit IANA timezone via `Intl`, so review schedules (absolute instants) are unaffected by travel, and day boundaries follow wherever the user is now.
