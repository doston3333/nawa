import "fake-indexeddb/auto";
import { beforeEach, expect, it } from "vitest";
import { closeOfflineDb, DB_NAME, openOfflineDb, readMeta, writeMeta } from "./indexed-db";

beforeEach(async () => {
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

it("opens with the complete offline schema", async () => {
  const db = await openOfflineDb();
  expect([...db.objectStoreNames].sort()).toEqual([
    "meta",
    "profiles",
    "sessions",
    "progress",
    "readingPositions",
    "outbox",
    "changes",
  ].sort());
  db.close();
});

it("persists metadata across database handles", async () => {
  await writeMeta("test", { value: 1 });
  expect(await readMeta<{ value: number }>("test")).toEqual({ value: 1 });
});
