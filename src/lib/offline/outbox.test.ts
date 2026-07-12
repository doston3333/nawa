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
