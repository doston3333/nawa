import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { closeOfflineDb, DB_NAME } from "./indexed-db";
import { enqueueMutation } from "./outbox";
import { listCachedChanges } from "./profile-cache";
import { flushOutbox, getDeviceId, pullProfileChanges, readSyncCursor, synchronizeProfile } from "./sync-client";
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

it("keeps the payload queued when the service worker reports offline as 503", async () => {
  const deviceId = await getDeviceId(profileId);
  await enqueueMutation(mutation(deviceId));
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/sync/devices")) return new Response("Offline", { status: 503 });
    return new Response("Offline", { status: 503 });
  });
  await expect(flushOutbox(profileId)).resolves.toMatchObject({ transient: true, rejected: 0 });
});

it("applies pull changes before storing the returned cursor", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    changes: [{ id: "1", entityType: "LESSON_PROGRESS", entityId: "p:script-1", operation: "UPSERT", revision: 1, payload: { id: "p:script-1", profileId, lessonId: "script-1", status: "COMPLETE" } }],
    cursor: "c1",
    hasMore: false,
  }), { status: 200 }));
  await expect(pullProfileChanges(profileId)).resolves.toMatchObject({ cursor: "c1", hasMore: false });
});

it("does not treat a push cursor as a pulled cursor", async () => {
  const deviceId = await getDeviceId(profileId);
  await enqueueMutation(mutation(deviceId));
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/sync/devices")) return new Response(JSON.stringify({ deviceId }), { status: 201 });
    if (url.endsWith("/api/sync/push")) {
      return new Response(JSON.stringify({ acknowledgements: [{ mutationId: mutation(deviceId).mutationId, status: "ACKNOWLEDGED" }], cursor: "push-only-cursor" }), { status: 200 });
    }
    return new Response(JSON.stringify({
      changes: [{ id: "9007199254740993", entityType: "LESSON_PROGRESS", entityId: `${profileId}:script-2`, operation: "UPSERT", revision: 1, payload: { id: `${profileId}:script-2`, profileId, lessonId: "script-2", status: "IN_PROGRESS" } }],
      cursor: "pull-cursor",
      hasMore: false,
    }), { status: 200 });
  });
  await expect(synchronizeProfile(profileId)).resolves.toMatchObject({ pull: { cursor: "pull-cursor" } });
  expect(await readSyncCursor(profileId)).toBe("pull-cursor");
  expect(await listCachedChanges(profileId)).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("coalesces overlapping profile synchronizations", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    changes: [],
    cursor: "c1",
    hasMore: false,
  }), { status: 200 }));

  const first = synchronizeProfile(profileId);
  const second = synchronizeProfile(profileId);
  expect(second).toBe(first);
  await expect(first).resolves.toMatchObject({ pull: { cursor: "c1" } });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("serializes a flush trigger with a concurrent full synchronization", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
    changes: [],
    cursor: "c2",
    hasMore: false,
  }), { status: 200 }));

  const flush = flushOutbox(profileId);
  const sync = synchronizeProfile(profileId);
  expect(sync).not.toBe(flush);
  await expect(flush).resolves.toMatchObject({ pushed: 0 });
  await expect(sync).resolves.toMatchObject({ pull: { cursor: "c2" } });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
