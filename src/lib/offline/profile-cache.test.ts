import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { closeOfflineDb, DB_NAME } from "./indexed-db";
import { applyServerChange, listCachedChanges, selectLatestActiveSession } from "./profile-cache";

const profileId = "00000000-0000-4000-8000-000000000010";

beforeEach(async () => {
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

it("sorts large server change IDs without lossy Number conversion", async () => {
  for (const id of ["9007199254740993", "9007199254740992", "90071992547409930"]) {
    await applyServerChange(profileId, {
      id,
      entityType: "LESSON_PROGRESS",
      entityId: `${profileId}:script-${id}`,
      operation: "UPSERT",
      revision: 1,
      payload: { id: `${profileId}:script-${id}` },
    });
  }
  expect((await listCachedChanges(profileId)).map((change) => change.id)).toEqual([
    "9007199254740992",
    "9007199254740993",
    "90071992547409930",
  ]);
});

it("selects the newest active cached session and rejects completed sessions", () => {
  const rows = [
    { id: "older", status: "ACTIVE", currentTaskIndex: 0, updatedAt: "2026-07-11T10:00:00.000Z", plan: { tasks: [{}] } },
    { id: "completed-newer", status: "COMPLETE", currentTaskIndex: 1, updatedAt: "2026-07-12T10:00:00.000Z", plan: { tasks: [{}] } },
    { id: "newest-active", status: "ACTIVE", currentTaskIndex: 0, updatedAt: "2026-07-12T09:00:00.000Z", plan: { tasks: [{}] } },
  ];
  expect(selectLatestActiveSession(rows)?.id).toBe("newest-active");
});
