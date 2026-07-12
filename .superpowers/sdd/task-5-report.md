# Task 5 report: offline-safe learning attempts

Implemented the Task 5 offline boundary for lessons and Study Room sessions.

## Delivered

- Added a shared replayable `STUDY_ATTEMPT` mutation builder preserving profile, device, session, task, next index, event ID, and payload.
- Cached started and advanced session projections in IndexedDB and restored a matching lesson/Study Room session when a network start fails.
- Kept the existing online request path unchanged; only network failures queue a mutation and advance the local task once. HTTP validation errors leave the task in place.
- Added support for syncing attempts without evidence for Study Room tasks that are intentionally non-assessed.
- Added accessible `SyncStatus` states and wired it into both focused session shells.
- Refreshed status after local mutations and safely handled environments without IndexedDB or browser storage.
- Stored the selected profile ID in browser storage as a cache lookup hint; the server profile cookie remains authoritative.

## Commits

- `82dbe59 feat: make learning sessions offline-safe`
- `097d451 fix: harden offline session restore coverage`

## Verification (2026-07-12)

Commands run from `/Users/doston/Downloads/nawa`:

```text
$ pnpm vitest run src/features/learn src/features/study-room src/features/offline
Test Files  9 passed (9)
Tests       17 passed (17)

$ pnpm test
Test Files  43 passed (43)
Tests       116 passed (116)

$ pnpm typecheck
tsc --noEmit (passed; no output)

$ pnpm lint
eslint . (passed; no output)

$ pnpm build
Next.js production build passed; TypeScript passed; 15 routes generated.

$ git diff --check
PASS (exit 0)
```

The focused coverage now includes a reload-like lesson restore from IndexedDB, Study Room local advancement plus queued mutation and restore, deterministic latest-active cache selection, and all four keyboard-readable SyncStatus states.
