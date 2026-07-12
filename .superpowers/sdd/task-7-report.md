# Task 7 report: cross-device and offline synchronization verification

Implemented the Milestone 1 browser and integration verification surface.

## Changes

- Global Playwright setup now creates deterministic `Amina` and `Omar` profiles,
  two Amina device records, and clears sync ledger rows without touching seeded
  curriculum atoms.
- Added desktop and 375px mobile browser flows covering two-profile isolation,
  profile-name persistence, independent lesson task indexes, offline outbox
  writes, reload recovery, reconnect synchronization, and server-side score
  updates.
- Added a production-only service-worker smoke test for the cached `/learn`
  shell. It intentionally does not exercise profile API responses, imports, or
  online-only AI work.
- Expanded sync integration coverage to replay one lesson attempt twice through
  the HTTP `/api/sync/push` route (while retaining direct service coverage) and
  assert exactly one evidence event, one lesson score, and one task advancement.
- Added a real two-device assertion: the same profile pushes independent
  session attempts through both registered Amina device IDs.
- Added profile isolation assertions for lesson paths and named identity.
- Added profile-scoped IndexedDB Learn-path caching and fallback when the path
  API is unavailable. Service-worker cache remains profile-agnostic and never
  stores profile API payloads.
- Kept transient network failures queued without presenting them as rejected
  mutations, while preserving explicit conflict/rejection status.

## Verification

- `pnpm db:migrate:deploy` — no pending migrations
- `pnpm test` — passed (46 files, 134 tests)
- `pnpm typecheck` — passed
- `pnpm lint` — passed
- `pnpm build` — passed
- `pnpm test:e2e` — passed (6 passed, 1 production-only test skipped)
- `pnpm vitest run src/features/learn/path-map.test.tsx src/lib/offline/sync-client.test.ts src/lib/offline/use-offline-status.test.ts tests/integration/sync.test.ts --reporter=dot` — passed (4 files, 13 tests)
- `git diff --check` — passed

Production smoke command:

```bash
pnpm build
E2E_PRODUCTION=1 pnpm test:e2e tests/e2e/profile-offline-sync.spec.ts --reporter=line
```

Result: passed (4 tests). The pre-fix reproduction failed the production shell
test because `/learn` could render the profile API fallback before its
profile-scoped IndexedDB path was hydrated; it now waits for and verifies that
projection before the offline reload.

The pre-fix default E2E gate also timed out in Study Room when a generated plan
had repeated stages and the test assumed one textbox per stage. The final gate
drives task markers and passed as reported above.
