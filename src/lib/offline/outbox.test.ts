import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { closeOfflineDb, DB_NAME } from "./indexed-db";
import {
  acknowledgeMutations,
  enqueueMutation,
  listPendingMutations,
  markMutationFailed,
} from "./outbox";
import type { SyncMutationInput } from "./types";

beforeEach(async () => {
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

const makeMutation = (mutationId = "00000000-0000-4000-8000-000000000001"): SyncMutationInput => ({
  mutationId,
  profileId: "00000000-0000-4000-8000-000000000010",
  deviceId: "00000000-0000-4000-8000-000000000011",
  kind: "LESSON_PROGRESS",
  baseRevision: null,
  createdAt: new Date().toISOString(),
  payload: { lessonId: "script-1", status: "IN_PROGRESS" },
});

it("keeps a queued mutation after a failed sync", async () => {
  const mutation = makeMutation();
  await enqueueMutation(mutation);
  await markMutationFailed(mutation.mutationId, "offline");
  expect((await listPendingMutations(mutation.profileId))[0]).toMatchObject({
    mutationId: mutation.mutationId,
    attempts: 1,
    lastError: "offline",
  });
});

it("is idempotent and acknowledges only selected mutations", async () => {
  const first = makeMutation();
  const second = makeMutation("00000000-0000-4000-8000-000000000002");
  await enqueueMutation(first);
  await enqueueMutation(second);
  await acknowledgeMutations([first.mutationId]);
  const pending = await listPendingMutations(first.profileId);
  expect(pending).toHaveLength(1);
  expect(pending[0]?.mutationId).toBe(second.mutationId);
});

it("rejects a different payload for an acknowledged mutation ID", async () => {
  const original = makeMutation();
  await enqueueMutation(original);
  await acknowledgeMutations([original.mutationId]);
  await expect(enqueueMutation({ ...original, payload: { lessonId: "script-2", status: "IN_PROGRESS" } }))
    .rejects.toThrow("already acknowledged with a different payload");
  expect(await listPendingMutations(original.profileId)).toHaveLength(0);
  await expect(enqueueMutation(original)).resolves.toBeUndefined();
});

it("returns all pending mutations by default so status counts are not capped", async () => {
  const profile = makeMutation().profileId;
  for (let index = 0; index < 60; index += 1) {
    await enqueueMutation(makeMutation(`00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`));
  }
  expect(await listPendingMutations(profile)).toHaveLength(60);
  expect(await listPendingMutations(profile, 50)).toHaveLength(50);
});

it("retains structured rejection details on a queued mutation", async () => {
  const original = makeMutation();
  await enqueueMutation(original);
  await markMutationFailed(original.mutationId, "conflict", { code: "BASE_REVISION_MISMATCH", expectedRevision: 4 });
  expect((await listPendingMutations(original.profileId))[0]).toMatchObject({
    lastError: "conflict",
    lastErrorDetails: { code: "BASE_REVISION_MISMATCH", expectedRevision: 4 },
  });
});
