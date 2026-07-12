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

## Verification

- Focused offline/status tests: 4 passed
- Full Vitest suite: 42 files, 110 tests passed
- TypeScript: passed
- ESLint: passed
- Production build: passed
- `git diff --check`: passed
