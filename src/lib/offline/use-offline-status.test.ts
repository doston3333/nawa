import "fake-indexeddb/auto";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { closeOfflineDb, DB_NAME } from "./indexed-db";
import { useOfflineStatus } from "./use-offline-status";

const profileId = "00000000-0000-4000-8000-000000000010";

beforeEach(async () => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

it("flushes and pulls on initial mount when already online", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ changes: [], cursor: "MA", hasMore: false }), { status: 200 }));
  const { result } = renderHook(() => useOfflineStatus(profileId));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/sync/pull"), expect.anything()));
  expect(result.current.online).toBe(true);
  expect(result.current.syncError).toBeNull();
});

