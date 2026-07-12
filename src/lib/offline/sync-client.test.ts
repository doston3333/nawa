import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { closeOfflineDb, DB_NAME } from "./indexed-db";
import { enqueueMutation } from "./outbox";
import { flushOutbox, getDeviceId, pullProfileChanges } from "./sync-client";
import type { SyncMutationInput } from "./types";

beforeEach(async () => {
  vi.restoreAllMocks();
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

const profileId = "00000000-0000-4000-8000-000000000010";
const mutation = (deviceId: string): SyncMutationInput => ({
  mutationId: "00000000-0000-4000-8000-000000000001",
  profileId,
  deviceId,
  kind: "LESSON_PROGRESS",
  baseRevision: null,
  createdAt: new Date().toISOString(),
  payload: { lessonId: "script-1", status: "IN_PROGRESS" },
});

it("registers a stable device before the first push and acknowledges it", async () => {
  const deviceId = await getDeviceId(profileId);
  await enqueueMutation(mutation(deviceId));
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/sync/devices")) return new Response(JSON.stringify({ deviceId }), { status: 201 });
    expect(url).toContain("/api/sync/push");
    return new Response(JSON.stringify({ acknowledgements: [{ mutationId: mutation(deviceId).mutationId, status: "ACKNOWLEDGED" }], cursor: "MA" }), { status: 200 });
  });
  await expect(flushOutbox(profileId)).resolves.toMatchObject({ pushed: 1 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("leaves the payload queued after a network failure", async () => {
  const deviceId = await getDeviceId(profileId);
  await enqueueMutation(mutation(deviceId));
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
  await expect(flushOutbox(profileId)).resolves.toMatchObject({ error: "offline" });
});

it("applies pull changes before storing the returned cursor", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    changes: [{ id: "1", entityType: "LESSON_PROGRESS", entityId: "p:script-1", operation: "UPSERT", revision: 1, payload: { id: "p:script-1", profileId, lessonId: "script-1", status: "COMPLETE" } }],
    cursor: "c1",
    hasMore: false,
  }), { status: 200 }));
  await expect(pullProfileChanges(profileId)).resolves.toMatchObject({ cursor: "c1", hasMore: false });
});
