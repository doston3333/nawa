# Task 3 report: idempotent study-attempt and progress synchronization

## Delivered

- Added browser/server-neutral sync contracts and implementation in `src/server/sync.ts`.
- Added idempotent `STUDY_ATTEMPT` and `LESSON_PROGRESS` mutation handling.
- Mutation UUIDs are ledgered in one Prisma transaction with the applied state and one `SyncChange` row.
- Replays return the stored result without creating another `EvidenceEvent`, mastery transition, lesson score, or session advance.
- Rejected and conflict outcomes are persisted with deterministic result payloads so retries return the same acknowledgement.
- Added opaque per-profile cursors and bounded pull (200 changes) with `hasMore`.
- Added `POST /api/sync/push` (maximum 50 mutations) and `GET /api/sync/pull` routes; both require the selected profile.
- Added transaction-aware repository helpers for evidence, lesson scores, completion, and strict sync session advancement.
- Updated the ordinary attempts route to avoid replayed lesson scoring/session advancement.

## Verification

Commands and observed output:

```text
pnpm typecheck
> nawa@0.1.0 typecheck
> tsc --noEmit
PASS (exit 0)

pnpm lint
> nawa@0.1.0 lint
> eslint .
PASS (exit 0)

pnpm vitest run src/server/sync.test.ts tests/integration/sync.test.ts src/app/api/study/sessions/\[sessionId\]/attempts/route.test.ts
Test Files  3 passed (3)
Tests       5 passed (5)

pnpm vitest run
Test Files  32 passed (32)
Tests       78 passed (78)
```

The focused tests cover replaying the same attempt, exactly-one evidence event and session advance, profile-mismatched event rejection, and pull-after-cursor. The integration test also verifies one mutation-ledger row and a stable replay cursor.

## Concerns and follow-ups

- The existing non-sync `advanceSession(sessionId, nextTaskIndex)` helper remains permissive for backwards compatibility with the Study Room's older resume tests. Sync mutation application uses strict one-step-or-replay validation. The attempts route now skips advancement when an event UUID is replayed.
- Cursor IDs are global PostgreSQL `BigInt` values encoded as base64url strings; the cursor returned by push/pull is scoped to the selected profile's change stream.
- Conflict payloads are recorded, but conflict resolution UI and browser outbox behavior belong to Tasks 4–5.
- No service worker, IndexedDB, or client synchronization code was added in this task.

## Reviewer fixes

- Per-entity advisory transaction locks and a unique `(profileId, entityType, entityId, revision)` index make revision allocation and lesson/mastery read-modify-write operations concurrency-safe.
- Cursor tokens are profile-bound; malformed, foreign, or non-numeric cursors raise `INVALID_CURSOR` and the pull route returns 400.
- Study attempt payloads now validate task membership, current/next task bounds, and replay position. Lesson progress validates curriculum membership and status/completion fields.
- Push requires a body-level `deviceId`, checks mutation/device consistency, and both the public service and route enforce that the registered device belongs to the selected profile. Route tests cover the 50-mutation bound, required device, profile/device mismatch, malformed payload, malformed cursor, and bounded pull delegation.

Focused verification after reviewer fixes:

```text
pnpm prisma migrate deploy
Applied migration 20260712130000_sync_revision_uniqueness

pnpm vitest run src/server/sync.test.ts tests/integration/sync.test.ts src/app/api/study/sessions/\[sessionId\]/attempts/route.test.ts
Test Files 3 passed (3)
Tests 8 passed (8)

pnpm lint
PASS (exit 0)

pnpm typecheck
PASS (exit 0)

git diff --check
PASS (exit 0)

pnpm test
Test Files 34 passed (34)
Tests 86 passed (86)

pnpm build
Compiled successfully; TypeScript passed; 14 static pages generated; sync routes present.
```
