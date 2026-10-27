# Privacy, security and content sources

## What is collected

- Learning history (answers' correctness, timing, which item, which format), placement results, settings and progression — stored locally in SQLite.
- The typed text of answers is stored **only on the device** (for your own history and export). Sync uploads attempts with the response removed.
- For desktop scheduling, Mocchi reads only the OS **idle time** (`powerMonitor.getSystemIdleTime`). It never reads screenshots, keystrokes, window titles, clipboard or browsing history.
- No analytics, no advertising use, no third-party services. The app works fully offline.

## When sync is enabled

- The server stores an anonymous user id, hashed device tokens and your events. Request bodies are never logged.
- Tokens are kept in the OS keychain (Electron `safeStorage` on desktop; iOS Keychain / Android Keystore via `expo-secure-store` on mobile).
- Use HTTPS in front of the server for anything beyond your own machine (the server warns when bound to a non-local address).
- **Delete account** removes the user and, via cascading foreign keys, every token, link code and event on the server. Local data stays until you also delete it.

## User controls

- Export all learning history as JSON (desktop: save dialog; mobile: share sheet).
- Delete all local data (desktop requires typing DELETE; mobile asks for confirmation).
- Pause (1 h, until tomorrow, indefinitely), snooze each prompt (15 min, 1 h, rest of day), quiet hours, daily caps, focus behaviour, per-category notifications.

## Robustness

- Database migrations run in transactions; a database from a newer version is refused, not modified.
- Network failures leave data queued (`pending` count in settings) and retried on the next sync.
- Notification permission denial is detected and explained with a link to system settings; learning continues manually.
- Missing TTS voices disable listening questions instead of showing broken audio.

## Content sources and licences

- The starter curriculum (vocabulary, example sentences, kanji readings and compounds, grammar notes and exercises, particle drills, expressions, reading passages) was **written for this project** and is MIT-licensed. Each item carries `source: { id: 'jc-curated', license, attribution }`.
- External datasets can be added as content packs via `importContentPack()` (`packages/japanese-content/src/validate.ts`). Packs are schema-validated, IDs are namespaced, and every item keeps the pack's attribution. Check each dataset's licence before redistributing it — for example JMdict and KANJIDIC are published by the EDRDG under CC BY-SA 4.0, which requires attribution and share-alike.
- Pixel font: DotGothic16 by Fontworks, SIL Open Font License 1.1 (via `@fontsource/dotgothic16` and `@expo-google-fonts/dotgothic16`).
- JLPT levels are approximate estimates and not affiliated with or endorsed by the official JLPT.
