import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { StudySessionView } from "@/domain/learning/types";
import { ACTIVE_PROFILE_STORAGE_KEY } from "@/features/offline/attempt-mutation";
import { closeOfflineDb, DB_NAME } from "@/lib/offline/indexed-db";
import { listPendingMutations } from "@/lib/offline/outbox";
import { useStudySession } from "./use-study-session";

const profileId = "00000000-0000-4000-8000-000000000011";
const sessionView: StudySessionView = {
  currentTaskIndex: 0,
  status: "ACTIVE",
  plan: {
    id: "00000000-0000-4000-8000-000000000101",
    profileId,
    durationMinutes: 30,
    createdAt: "2026-07-11T10:00:00.000Z",
    mode: "STUDY_ROOM",
    tasks: [
      { id: "arrival-1", stage: "ARRIVAL", kind: "CALIBRATION", atomIds: [], prompt: "Arrive", promptArabic: "بَ", expectedAnswer: null, estimatedMinutes: 2 },
      { id: "concept-1", stage: "NEW_CONCEPT", kind: "LESSON", atomIds: ["letter-ba"], prompt: "Write", promptArabic: "بَ", expectedAnswer: "ب", estimatedMinutes: 5 },
    ],
  },
};

beforeEach(async () => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  await closeOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
  window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
});

it("advances a loaded Study Room task offline, queues it, and restores the projection", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify(sessionView), { status: 201 }))
    .mockRejectedValueOnce(new TypeError("Failed to fetch"));
  const first = renderHook(() => useStudySession(30));
  await waitFor(() => expect(first.result.current.currentTask).not.toBeNull());

  await act(async () => {
    await first.result.current.submitAttempt({
      answer: "",
      helpLevel: 0,
      attempted: true,
      startedAt: new Date().toISOString(),
      confidence: 3,
    });
  });

  expect(first.result.current.view?.currentTaskIndex).toBe(1);
  expect(await listPendingMutations(profileId)).toHaveLength(1);
  first.unmount();

  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  const restored = renderHook(() => useStudySession(30));
  await waitFor(() => expect(restored.result.current.loading).toBe(false));

  expect(restored.result.current.view?.currentTaskIndex).toBe(1);
  expect(restored.result.current.currentTask?.id).toBe("concept-1");
});
