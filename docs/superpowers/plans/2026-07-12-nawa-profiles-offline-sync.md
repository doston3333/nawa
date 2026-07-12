# Nawa Profiles and Offline Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Add passwordless named profiles, profile-owned learning state, an idempotent synchronization protocol, browser outbox storage, and an offline-capable application shell for two or three personal users.

**Architecture:** PostgreSQL remains canonical. A `Profile` owns existing learning records, and a `SyncMutation` ledger makes replay safe. Browsers use native IndexedDB for profile-scoped cached state and an outbox; a small client synchronizer pushes mutations and pulls a cursor-based change feed. A versioned service worker precaches only public shell/static assets, then runtime-caches successfully loaded generic learning route shells without placing profile-specific API payloads in Cache Storage.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Prisma 7/PostgreSQL, native IndexedDB, browser Service Worker API, Vitest/Testing Library, Playwright.

## Global Constraints

- Two or three known users; named profile selection is sufficient and no password/authentication service is added.
- Reading and writing are the only tracked abilities for this milestone; do not add speech, listening, audio, handwriting, or AI tutor behavior.
- Every server read/write validates profile ownership.
- Every offline mutation has a stable UUID and is applied idempotently on replay.
- Original user data is never overwritten by generated data.
- Existing anonymous learner data must be migrated into a named default profile without changing evidence, mastery, session, or lesson identifiers.
- The first visit, uncached documents, imports, OCR, translation, and contextual AI analysis require connectivity.
- Previously loaded shell routes, curriculum, active lessons, notes, and reading positions must work offline after synchronization.
- Conflicts preserve both complete versions; no silent last-write overwrite for notebook-like content.
- The profile cookie is httpOnly and same-site; `Secure` is enabled only when served over HTTPS so local HTTP development works.
- Keep the existing process-local rate limits; do not introduce Redis or distributed infrastructure.
- Primary interactions must work at 375px width and with keyboard navigation.
- Use the existing `@/*` alias and repository naming conventions.
- A task is complete only after its focused tests pass, then the full unit suite, typecheck, lint, build, and relevant Playwright flows pass.

## Milestone boundary

This plan does not implement Notebook, Reader, imports, Language Ink enrichment, curriculum editing, or delayed assessments. It creates the profile, ownership, offline, and sync contracts those later milestones consume.

## File map

### Persistence and server boundaries

- Modify `prisma/schema.prisma`: rename the existing `Learner` ownership model to `Profile`, add profile names, and add `Device`, `SyncMutation`, and `SyncChange`; migrate existing learner ownership to profile ownership.
- Create `prisma/migrations/20260712090000_profiles_and_sync/migration.sql`: backfill one default profile per existing learner, rename ownership columns, create sync tables and indexes.
- Modify `prisma/seed.ts`: seed a deterministic local profile name without creating a shared demo learner.
- Modify `src/server/db.ts`: keep the Prisma adapter singleton and expose the new generated models through normal Prisma client access.
- Create `src/server/profile.ts`: resolve the profile cookie, list profiles, create/select profiles, and enforce profile ownership.
- Create `src/server/sync.ts`: validate mutation envelopes, apply supported Milestone 1 mutations, append changes, and return idempotent results.
- Modify `src/server/repositories/study-repository.ts`: accept `profileId`, preserve evidence IDs, and make attempt replay safe.
- Modify `src/server/repositories/lesson-repository.ts`: use profile ownership and return profile-scoped progress.
- Modify `src/server/public-learner.ts`: replace public-demo semantics with a compatibility wrapper around the selected profile while preserving existing callers during migration.

### HTTP routes and app shell

- Create `src/app/api/profiles/route.ts`: list and create passwordless named profiles.
- Create `src/app/api/profile/select/route.ts`: set the selected profile cookie.
- Create `src/app/api/sync/push/route.ts`: accept ordered mutation envelopes and return per-mutation acknowledgements/conflicts.
- Create `src/app/api/sync/pull/route.ts`: return profile-scoped changes after a cursor.
- Create `src/app/profiles/page.tsx`: first-run/profile-switch screen.
- Create `src/features/profile/profile-picker.tsx`: accessible profile selection and creation UI.
- Create `src/app/sw-register.tsx`: client component that registers `/sw.js` after hydration.
- Modify `src/app/layout.tsx`: render `SwRegister` and keep metadata/PWA manifest intact.
- Modify `src/app/page.tsx`, `src/app/learn/page.tsx`, and `src/app/study/page.tsx`: redirect or gate the learning shell until a profile is selected.

### Browser storage and synchronization

- Create `src/lib/offline/types.ts`: shared browser-only mutation, cursor, and sync result types.
- Create `src/lib/offline/indexed-db.ts`: native IndexedDB schema/open/transaction helpers.
- Create `src/lib/offline/outbox.ts`: enqueue, list, acknowledge, fail, and retry mutations.
- Create `src/lib/offline/sync-client.ts`: online push/pull loop with stable device ID and cursor persistence.
- Create `src/lib/offline/profile-cache.ts`: cache profile metadata, lesson/session projections, and reading-position records.
- Create `src/lib/offline/use-offline-status.ts`: reactive online/offline state for UI copy.
- Modify `src/features/learn/use-lesson-session.ts`: use cached state and enqueue attempts when offline; flush when online.
- Modify `src/features/study-room/use-study-session.ts`: use the same offline mutation boundary for Study Room attempts.
- Create `public/sw.js`: cache shell and safe GET resources; never cache mutation responses.

### Tests and docs

- Create `src/server/profile.test.ts`.
- Create `src/server/sync.test.ts`.
- Create `src/lib/offline/indexed-db.test.ts`.
- Create `src/lib/offline/outbox.test.ts`.
- Create `src/lib/offline/sync-client.test.ts`.
- Create `src/features/profile/profile-picker.test.tsx`.
- Modify `src/app/api/study/sessions/[sessionId]/attempts/route.test.ts`: cover idempotent replay and profile mismatch.
- Modify `tests/integration/public-isolation.test.ts`: verify profile isolation after migration.
- Create `tests/integration/sync.test.ts`: verify push/pull cursors, replay, and profile ownership.
- Modify `tests/e2e/global-setup.ts`: create two named profiles and clear sync state between runs.
- Create `tests/e2e/profile-offline-sync.spec.ts`: two browser contexts, offline edits, reconnect, and duplicate replay.
- Modify `README.md`: local profile selection, offline guarantees, sync states, and the VPS boundary.
- Modify `docs/superpowers/plans/2026-07-11-nawa-foundation-study-room.md`: mark the historical Plan 1 checklist as superseded/completed rather than leaving unchecked steps as current work.

---

### Task 1: Add profile ownership and the sync ledger to PostgreSQL

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260712090000_profiles_and_sync/migration.sql`
- Create: `src/server/profile.test.ts`
- Test: `tests/integration/public-isolation.test.ts`

**Interfaces:**
- Consumes: Existing `Learner`, `StudySession`, `EvidenceEvent`, `MasterySnapshot`, and `LessonProgress` rows.
- Produces: `Profile`, `Device`, `SyncMutation`, and `SyncChange` models; all existing learning records address ownership through `profileId`, and the old `Learner` table/model no longer remains as a second ownership source.

- [ ] **Step 1: Write the failing ownership tests**

Add tests that create two profiles and prove that `listProfiles()` returns both, that a profile cannot read the other profile's sessions, and that a duplicate mutation ID returns one ledger row.

```ts
it("keeps profile-owned sessions isolated", async () => {
  const first = await createProfile("First");
  const second = await createProfile("Second");
  await createProfileSession(first.id);

  expect(await listProfileSessions(second.id)).toEqual([]);
  expect(await listProfileSessions(first.id)).toHaveLength(1);
});

it("stores one sync mutation for a replayed mutation id", async () => {
  const profile = await createProfile("First");
  const mutation = { mutationId: randomUUID(), profileId: profile.id, deviceId: randomUUID() };
  await recordMutation(mutation);
  await recordMutation(mutation);
  expect(await countMutations(mutation.mutationId)).toBe(1);
});
```

- [ ] **Step 2: Run the focused tests and verify the models are absent**

Run: `pnpm vitest run src/server/profile.test.ts tests/integration/public-isolation.test.ts`

Expected: FAIL because `Profile`, `createProfile`, and the sync ledger do not exist.

- [ ] **Step 3: Add Prisma models and ownership fields**

Add these model contracts, adapting relation names to the existing schema:

```prisma
model Profile {
  id        String    @id @db.Uuid
  name      String
  createdAt DateTime  @default(now())
  mastery   MasterySnapshot[]
  evidence  EvidenceEvent[]
  sessions  StudySession[]
  lessons   LessonProgress[]
  devices   Device[]
  mutations SyncMutation[]
  changes   SyncChange[]
}

model Device {
  id         String   @id @db.Uuid
  profileId  String   @db.Uuid
  label      String
  createdAt  DateTime @default(now())
  lastSeenAt DateTime @default(now())
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, lastSeenAt])
}

model SyncMutation {
  mutationId String   @id @db.Uuid
  profileId  String   @db.Uuid
  deviceId   String   @db.Uuid
  kind       String
  payload    Json
  status     String   @default("ACKNOWLEDGED")
  result     Json?
  createdAt  DateTime @default(now())
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, createdAt])
}

model SyncChange {
  id         BigInt   @id @default(autoincrement())
  profileId  String   @db.Uuid
  entityType String
  entityId   String
  operation  String
  revision   Int
  payload    Json
  createdAt  DateTime @default(now())
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId, id])
  @@index([profileId, entityType, entityId, revision])
}
```

Rename the existing `Learner` table to `Profile`, add the `name` column, and add non-null `profileId` ownership to existing learning records through a migration that backfills from the current `learnerId` before dropping the old ownership columns. Keep the original UUID values unchanged so evidence and session references remain stable. Update Prisma relation names and repository arguments from `learnerId` to `profileId` in the same task; do not leave two competing ownership concepts in generated code.

- [ ] **Step 4: Write the migration backfill and indexes**

The migration must:

1. Rename the existing `Learner` table to `Profile`, add `name`, and assign names `Learner 1`, `Learner 2`, etc., ordered by `createdAt, id`.
2. Add and backfill `profileId` on `StudySession`, `EvidenceEvent`, `MasterySnapshot`, and `LessonProgress` from their existing learner ownership.
3. Add foreign keys and non-null constraints after the backfill.
4. Create the `Device`, `SyncMutation`, and `SyncChange` tables and indexes.
5. Preserve all existing primary keys and timestamps.

- [ ] **Step 5: Generate Prisma and run the focused tests**

Run: `pnpm db:generate`

Run: `pnpm vitest run src/server/profile.test.ts tests/integration/public-isolation.test.ts`

Expected: profile isolation and single-row mutation replay tests pass.

- [ ] **Step 6: Commit the persistence boundary**

```bash
git add prisma/schema.prisma prisma/migrations src/server/profile.test.ts tests/integration/public-isolation.test.ts
git commit -m "feat: add profile ownership and sync ledger"
```

### Task 2: Implement profile selection and migrate the cookie boundary

**Files:**
- Create: `src/server/profile.ts`
- Modify: `src/server/public-learner.ts`
- Create: `src/app/api/profiles/route.ts`
- Create: `src/app/api/profile/select/route.ts`
- Create: `src/features/profile/profile-picker.tsx`
- Create: `src/features/profile/profile-picker.test.tsx`
- Create: `src/app/profiles/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/learn/page.tsx`
- Modify: `src/app/study/page.tsx`

**Interfaces:**
- Consumes: `Profile` model and ownership helpers from Task 1.
- Produces: `GET /api/profiles`, `POST /api/profiles`, `POST /api/profile/select`, and `resolveProfileId()`.

- [ ] **Step 1: Write profile API and picker tests**

Test that the picker renders named profiles, can create a profile, selects a profile through the server route, and shows an explicit “no password” privacy note.

```tsx
it("lets a known user choose a profile without implying authentication", async () => {
  render(<ProfilePicker initialProfiles={[{ id: "p1", name: "Amina" }]} />);
  expect(screen.getByRole("heading", { name: "Who is studying?" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Amina" })).toBeVisible();
  expect(screen.getByText(/no password/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the focused UI test and verify the picker is absent**

Run: `pnpm vitest run src/features/profile/profile-picker.test.tsx`

Expected: FAIL because the route and component do not exist.

- [ ] **Step 3: Implement server profile helpers**

Expose these functions:

```ts
export interface ProfileSummary { id: string; name: string; }
export async function listProfiles(): Promise<ProfileSummary[]>;
export async function createProfile(name: string): Promise<ProfileSummary>;
export async function resolveProfileId(): Promise<string>;
export async function selectProfile(profileId: string): Promise<void>;
```

`resolveProfileId()` reads `nawa_profile_id`, validates UUID format, verifies the profile exists, and creates a default profile only when the legacy learner cookie identifies an existing learner. It must not silently select another user's profile.

- [ ] **Step 4: Implement profile routes and cookie settings**

`GET /api/profiles` returns `{ profiles: ProfileSummary[] }`. `POST /api/profiles` accepts `{ name: string }`, trims whitespace, rejects blank names and names longer than 80 characters, and returns `201` with the created profile. `POST /api/profile/select` accepts `{ profileId: string }`, verifies it exists, and sets `nawa_profile_id` with `httpOnly`, `sameSite: "lax"`, `path: "/"`, 400-day max age, and conditional `secure`.

- [ ] **Step 5: Implement the accessible picker route**

The picker must support keyboard focus, Enter activation, profile creation, and a visible note: “Profiles are separate notebooks and progress, but this private app does not use passwords.” After selection it navigates to `/` and refreshes server state.

- [ ] **Step 6: Gate learning routes and preserve compatibility**

Update current routes and repository callers to use `resolveProfileId()`. Keep `resolvePublicLearnerId()` as a thin compatibility alias returning the selected profile ID until Tasks 3–4 remove all call sites. If no profile exists, render or redirect to `/profiles` instead of returning a blank error state.

- [ ] **Step 7: Run focused tests and commit**

Run: `pnpm vitest run src/features/profile/profile-picker.test.tsx src/server/profile.test.ts src/app/api/health/route.test.ts`

```bash
git add src/server/profile.ts src/server/public-learner.ts src/app/api/profiles src/app/api/profile src/features/profile src/app/profiles src/app/page.tsx src/app/learn/page.tsx src/app/study/page.tsx
git commit -m "feat: add passwordless profile selection"
```

### Task 3: Make study attempts and progress idempotently synchronizable

**Files:**
- Create: `src/server/sync.ts`
- Create: `src/server/sync.test.ts`
- Modify: `src/server/repositories/study-repository.ts`
- Modify: `src/server/repositories/lesson-repository.ts`
- Modify: `src/app/api/study/sessions/[sessionId]/attempts/route.ts`
- Create: `src/app/api/sync/push/route.ts`
- Create: `src/app/api/sync/pull/route.ts`
- Create: `tests/integration/sync.test.ts`

**Interfaces:**
- Consumes: Profile ownership and sync tables from Tasks 1–2.
- Produces: `pushMutations(input): Promise<SyncPushResult>` and `pullChanges(input): Promise<SyncPullResult>`.

Define these browser/server-neutral contracts:

```ts
export type SyncMutationKind = "STUDY_ATTEMPT" | "LESSON_PROGRESS";

export interface SyncMutationInput {
  mutationId: string;
  profileId: string;
  deviceId: string;
  kind: SyncMutationKind;
  baseRevision: number | null;
  createdAt: string;
  payload: unknown;
}

export interface SyncPushResult {
  acknowledgements: Array<{ mutationId: string; status: "ACKNOWLEDGED" | "CONFLICT" | "REJECTED"; result?: unknown; conflict?: unknown }>;
  cursor: string;
}

export interface SyncPullResult {
  changes: Array<{ id: string; entityType: string; entityId: string; operation: string; revision: number; payload: unknown }>;
  cursor: string;
}
```

- [ ] **Step 1: Write failing idempotency tests**

Add tests that push the same study attempt twice, confirm one evidence event and one mastery transition, reject a payload for a different profile, and pull changes after a cursor.

```ts
it("replaying a study attempt does not advance twice", async () => {
  const mutation = studyAttemptMutation(profileId, sessionId);
  const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
  const second = await pushMutations({ profileId, deviceId, mutations: [mutation] });
  expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
  expect(await countEvidence(mutation.payload.event.id)).toBe(1);
  expect(first.cursor).toBe(second.cursor);
});
```

- [ ] **Step 2: Run focused tests and verify the sync service is absent**

Run: `pnpm vitest run src/server/sync.test.ts tests/integration/sync.test.ts`

Expected: FAIL because no sync service or routes exist.

- [ ] **Step 3: Implement the mutation ledger transaction**

Within one Prisma transaction, lookup `mutationId`. If it exists, return the stored result without reapplying. Otherwise validate `profileId`, apply the supported operation, persist the result, and create one `SyncChange` row. A rejected mutation is stored with `status: "REJECTED"` and its stable error result so retries remain deterministic.

- [ ] **Step 4: Make study attempt application replay-safe**

Before creating an `EvidenceEvent`, check the event UUID. If it exists for the same profile/session/task, return its existing mastery result and do not call `advanceSession` again. If it exists for a different profile, reject with 403. Validate that `nextTaskIndex` is exactly the current index plus one or the existing index for a replay.

- [ ] **Step 5: Implement push and pull routes**

`POST /api/sync/push` accepts at most 50 mutations, requires the selected profile cookie to match every `profileId`, applies them in request order, and returns acknowledgements plus a cursor. `GET /api/sync/pull?cursor=<opaque>` requires the selected profile and returns at most 200 changes, newest cursor, and `hasMore`.

- [ ] **Step 6: Run integration tests and commit**

Run: `pnpm vitest run src/server/sync.test.ts tests/integration/sync.test.ts src/app/api/study/sessions/\[sessionId\]/attempts/route.test.ts`

```bash
git add src/server/sync.ts src/server/sync.test.ts src/server/repositories src/app/api/sync src/app/api/study/sessions tests/integration/sync.test.ts
git commit -m "feat: add idempotent progress synchronization"
```

### Task 4: Add browser IndexedDB, outbox, and online synchronization

**Files:**
- Create: `src/lib/offline/types.ts`
- Create: `src/lib/offline/indexed-db.ts`
- Create: `src/lib/offline/outbox.ts`
- Create: `src/lib/offline/profile-cache.ts`
- Create: `src/lib/offline/sync-client.ts`
- Create: `src/lib/offline/use-offline-status.ts`
- Create: `src/lib/offline/indexed-db.test.ts`
- Create: `src/lib/offline/outbox.test.ts`
- Create: `src/lib/offline/sync-client.test.ts`

**Interfaces:**
- Consumes: `SyncMutationInput`, `SyncPushResult`, and `SyncPullResult` from Task 3.
- Produces: `openOfflineDb()`, `enqueueMutation()`, `flushOutbox()`, `pullProfileChanges()`, and `useOfflineStatus()`.

Use these object-store names: `meta`, `profiles`, `sessions`, `progress`, `readingPositions`, `outbox`, `changes`. The database name is `nawa-offline-v1`. The `outbox` key is `mutationId`; `changes` key is the server change ID.

- [ ] **Step 1: Write failing IndexedDB and outbox tests**

Test opening creates all stores, enqueueing a mutation survives a second read, acknowledgement deletes only the acknowledged mutation, and a failed request increments `attempts` without dropping the payload.

```ts
it("keeps a queued mutation after a failed sync", async () => {
  const mutation = makeMutation();
  await enqueueMutation(mutation);
  await markMutationFailed(mutation.mutationId, "offline");
  expect((await listPendingMutations(mutation.profileId))[0]).toMatchObject({ mutationId: mutation.mutationId, attempts: 1, lastError: "offline" });
});
```

- [ ] **Step 2: Run the focused browser-storage tests and verify the stores are absent**

Run: `pnpm vitest run src/lib/offline/indexed-db.test.ts src/lib/offline/outbox.test.ts`

Expected: FAIL because the native IndexedDB helpers do not exist.

- [ ] **Step 3: Implement IndexedDB helpers**

Define:

```ts
export interface PendingMutation extends SyncMutationInput {
  attempts: number;
  lastError: string | null;
  queuedAt: string;
}

export function openOfflineDb(): Promise<IDBDatabase>;
export function readMeta<T>(key: string): Promise<T | undefined>;
export function writeMeta<T>(key: string, value: T): Promise<void>;
```

The upgrade callback creates the exact stores listed above and indexes `outbox` by `profileId` and `queuedAt`, `changes` by `profileId` and `id`.

- [ ] **Step 4: Implement outbox operations**

Define:

```ts
export function enqueueMutation(mutation: SyncMutationInput): Promise<void>;
export function listPendingMutations(profileId: string, limit?: number): Promise<PendingMutation[]>;
export function acknowledgeMutations(mutationIds: string[]): Promise<void>;
export function markMutationFailed(mutationId: string, error: string): Promise<void>;
```

`enqueueMutation` is idempotent by `mutationId`. It must not overwrite an acknowledged mutation with a different payload.

- [ ] **Step 5: Implement push/pull synchronization**

`flushOutbox(profileId)` reads the stable `deviceId` from `meta`, submits at most 50 pending mutations to `/api/sync/push`, acknowledges successful entries, records conflicts without deleting their local payloads, and stops after a network error. `pullProfileChanges(profileId)` submits the stored cursor to `/api/sync/pull`, applies changes in ascending server ID order, stores the new cursor only after all changes apply, and returns `hasMore` for another page.

- [ ] **Step 6: Implement online status and browser event wiring**

`useOfflineStatus()` returns `{ online, pendingCount, lastSyncAt, syncError }`. Add `online` event handling that calls `flushOutbox` for the active profile. Never use `navigator.onLine` as proof that the server is reachable; the first failed request sets `syncError` and leaves the mutation queued.

- [ ] **Step 7: Run focused tests and commit**

Run: `pnpm vitest run src/lib/offline`

```bash
git add src/lib/offline
git commit -m "feat: add browser offline outbox"
```

### Task 5: Route learning attempts through the offline boundary

**Files:**
- Modify: `src/features/learn/use-lesson-session.ts`
- Modify: `src/features/study-room/use-study-session.ts`
- Modify: `src/features/learn/lesson-runner.tsx`
- Modify: `src/features/study-room/study-room.tsx`
- Create: `src/features/offline/sync-status.tsx`
- Create: `src/features/offline/sync-status.test.tsx`

**Interfaces:**
- Consumes: `enqueueMutation`, `flushOutbox`, `pullProfileChanges`, and `useOfflineStatus` from Task 4.
- Produces: offline-safe lesson and Study Room attempt behavior with visible sync state.

- [ ] **Step 1: Write the failing offline attempt test**

Mock `fetch` to reject while offline, submit one lesson answer, reload the hook state from IndexedDB, and assert the current task advances locally while one mutation remains pending.

```ts
it("advances locally and queues an attempt when the network is unavailable", async () => {
  mockFetchNetworkError();
  const session = renderHook(() => useLessonSession("script-1"));
  await waitFor(() => expect(session.result.current.currentTask).not.toBeNull());
  await act(() => session.result.current.submitAttempt(answerSubmission("ا")));
  expect(session.result.current.view?.currentTaskIndex).toBe(1);
  expect(await listPendingMutations(profileId)).toHaveLength(1);
});
```

- [ ] **Step 2: Run the focused test and verify current behavior fails offline**

Run: `pnpm vitest run src/features/learn src/features/study-room`

Expected: the new offline test fails because the hooks currently surface a fetch error and do not persist local state.

- [ ] **Step 3: Extract a shared attempt mutation builder**

Create a helper that preserves the existing event ID, session ID, task ID, next task index, selected profile ID, and full event payload. The payload must be sufficient for the server to apply the same operation later without depending on transient React state.

- [ ] **Step 4: Add optimistic local progression**

When online, keep the existing request path and enqueue only after a successful server response if the server returns a change cursor. When offline or when a request fails with a network error, persist the session projection, advance the local task index exactly once, and enqueue the mutation. Do not treat a 4xx validation error as offline; leave the task in place and show the server error.

- [ ] **Step 5: Add sync-state copy to the focused shells**

Render `SyncStatus` near the existing session status with these exact states: `Saved locally · waiting to sync`, `Synced`, `Sync needs attention`, and `Internet required for this action`. The status must be announced with `role="status"` and remain keyboard-readable.

- [ ] **Step 6: Run focused tests and commit**

Run: `pnpm vitest run src/features/learn src/features/study-room src/features/offline`

```bash
git add src/features/learn src/features/study-room src/features/offline
git commit -m "feat: make learning sessions offline-safe"
```

### Task 6: Register the service worker and cache the offline shell

**Files:**
- Create: `public/sw.js`
- Create: `src/app/sw-register.tsx`
- Create: `src/app/sw.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/manifest.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: browser storage and sync status from Tasks 4–5.
- Produces: a registered versioned service worker with safe cache rules.

- [ ] **Step 1: Write the failing registration test**

Assert that the registration component calls `navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })` once in a browser context and does nothing when the API is absent.

- [ ] **Step 2: Implement `public/sw.js`**

Use cache name `nawa-shell-v2`; this intentional security version bump supersedes the earlier v1 sketch because profile-picker and profile-specific responses must not be retained. On install, precache only public `/`, `/manifest.webmanifest`, and icon assets. On activate, remove older `nawa-shell-*` caches. For GET requests, serve cache-first for same-origin public shell/static assets plus `/learn` and `/study` after a successful online load. Cache those learning routes only when the response is a non-redirected `200`; a redirect to `/profiles` (or any other profile-picker response) is never cached. Keep profile-specific API payloads network-only in the service worker; the profile-scoped IndexedDB layer owns offline data. Never intercept POST/PUT/PATCH/DELETE requests.

- [ ] **Step 3: Implement registration and cache-safe headers**

Register only in production or when `NEXT_PUBLIC_ENABLE_SW=true`; keep local tests deterministic. Add a `headers()` rule in `next.config.ts` for `/sw.js` that returns `Content-Type: application/javascript` and `Cache-Control: no-cache` so updates are discoverable.

- [ ] **Step 4: Preserve the manifest and add offline metadata**

Keep the current standalone manifest and add `id: "/"`, `scope: "/"`, and `prefer_related_applications: false`. Do not claim that AI or imports work offline in metadata or UI copy.

- [ ] **Step 5: Run focused tests and commit**

Run: `pnpm vitest run src/app/sw.test.tsx src/app/page.test.tsx`

```bash
git add public/sw.js src/app/sw-register.tsx src/app/sw.test.tsx src/app/layout.tsx src/app/manifest.ts next.config.ts
git commit -m "feat: add offline app shell"
```

### Task 7: Add cross-device integration and Playwright verification

**Files:**
- Modify: `tests/e2e/global-setup.ts`
- Create: `tests/e2e/profile-offline-sync.spec.ts`
- Modify: `tests/integration/public-isolation.test.ts`
- Create: `tests/integration/sync.test.ts`

**Interfaces:**
- Consumes: all profile, sync, IndexedDB, and service-worker contracts from Tasks 1–6.
- Produces: evidence for the Milestone 1 acceptance gate.

- [ ] **Step 1: Add integration fixtures for two profiles and two devices**

The fixture must create `Amina` and `Omar`, create two device IDs for Amina, and clear `SyncMutation`/`SyncChange` rows in global setup without deleting curriculum seed data.

- [ ] **Step 2: Add the browser flow for profile isolation**

Open two browser contexts, select different profiles, start a lesson in each, and assert that each context sees its own current task index and profile name after reload.

- [ ] **Step 3: Add the offline outbox flow**

In context A, open `/learn/script-1`, route API requests offline after the first task loads, submit an answer, reload, and assert `Saved locally · waiting to sync` plus the advanced task index. Restore the network and assert `Synced` and the server-side progress update.

- [ ] **Step 4: Add duplicate replay coverage**

Replay the same stored mutation through the sync endpoint and assert one evidence event, one lesson-score increment, and one task advancement.

- [ ] **Step 5: Add service-worker smoke coverage**

Run the browser in a production build, wait for `/sw.js` registration, reload `/learn` once offline, and assert the shell renders. Do not test uncached imports or AI analysis in this milestone.

- [ ] **Step 6: Run the complete Milestone 1 gate**

Run:

```bash
pnpm db:migrate:deploy
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Expected: all commands exit 0; the new cross-device/offline test passes on desktop and 375px mobile viewports.

- [ ] **Step 7: Commit the verification surface**

```bash
git add tests/e2e tests/integration
git commit -m "test: verify profile offline synchronization"
```

### Task 8: Update local operations and historical documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-11-nawa-foundation-study-room.md`
- Modify: `docs/superpowers/plans/2026-07-11-nawa-v1-program-roadmap.md`
- Modify: `package.json`
- Create: `scripts/backup-local.mjs`
- Create: `scripts/restore-local.mjs`

**Interfaces:**
- Consumes: production schema and upload/storage contract from Tasks 1–7.
- Produces: truthful local/VPS runbook and verified backup/restore commands.

- [ ] **Step 1: Write backup/restore tests or dry-run checks**

Verify backup output includes a PostgreSQL dump and the uploads directory, and restore refuses a missing backup directory or a non-local database URL unless `ALLOW_RESTORE=true` is explicitly set.

- [ ] **Step 2: Implement backup and restore scripts**

`pnpm backup:local` writes a timestamped directory under `.data/backups/` containing `nawa.sql` and `uploads/`. `pnpm restore:local -- <backup-dir>` restores the dump and copies uploads after validating the backup manifest. Add both scripts to `package.json`.

- [ ] **Step 3: Rewrite README operational copy**

Document named profiles, offline guarantees, sync statuses, the explicit online requirement for imports/AI, local Docker operation, and a later single-VPS deployment path. Remove public-demo language that implies internet-scale or anonymous public usage.

- [ ] **Step 4: Mark old plans as historical and point to the new spec**

Add a status note to the foundation plan that its unchecked task boxes are historical implementation notes, not current work. Update the roadmap to point to the personal reading/writing spec and list speech, listening, audio, handwriting, distributed rate limits, and public-scale accounts as removed scope.

- [ ] **Step 5: Run documentation and full verification checks**

Run: `git diff --check`

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`

- [ ] **Step 6: Commit the Milestone 1 handoff**

```bash
git add README.md docs/superpowers/plans scripts package.json
git commit -m "docs: document personal offline deployment"
```

## Milestone 1 completion gate

Milestone 1 is complete only when all of the following are true:

- Two named passwordless profiles exist and remain isolated.
- Existing anonymous learner data was migrated into a named default profile without changing evidence/session/mastery identifiers.
- A profile's lesson progress can be advanced offline, survive reload, and synchronize exactly once after reconnecting.
- The same profile can be opened in two browser contexts with two device IDs and receive the same server change feed.
- Replaying a mutation never duplicates evidence, score increments, or task advancement.
- The service worker serves previously loaded shell routes offline and never intercepts mutation requests.
- Sync status is visible and accessible.
- Local production mode survives a restart with profile data and sync ledger intact.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e` pass.
- README and historical plans accurately describe the personal reading/writing scope.

After this gate, create a separate implementation plan for Milestone 2 Notebook, Library, Reader, and imports using the stable profile, storage, and synchronization contracts.
