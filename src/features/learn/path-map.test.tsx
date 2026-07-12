import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { LearnPathView } from "@/domain/learning/types";
import { ACTIVE_PROFILE_STORAGE_KEY } from "@/features/offline/attempt-mutation";
import { closeOfflineDb, DB_NAME } from "@/lib/offline/indexed-db";
import { cacheLearnPath } from "@/lib/offline/profile-cache";
import { PathMap } from "./path-map";

const profileId = "00000000-0000-4000-8000-000000000010";
const path: LearnPathView = { units: [], nextLessonId: "script-1" };

beforeEach(async () => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

it("renders the profile-scoped cached path when the path API is unavailable", async () => {
  await cacheLearnPath(profileId, path);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

  render(<PathMap />);

  await waitFor(() => expect(screen.getByRole("heading", { name: "Your lessons" })).toBeVisible());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("does not pretend an uncached path is available offline", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

  render(<PathMap />);

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Internet required"));
});
