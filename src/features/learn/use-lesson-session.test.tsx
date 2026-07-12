import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { StudySessionView } from "@/domain/learning/types";
import { closeOfflineDb, DB_NAME } from "@/lib/offline/indexed-db";
import { listPendingMutations } from "@/lib/offline/outbox";
import { cacheSession } from "@/lib/offline/profile-cache";
import { ACTIVE_PROFILE_STORAGE_KEY } from "@/features/offline/attempt-mutation";
import { useLessonSession } from "./use-lesson-session";

const profileId = "00000000-0000-4000-8000-000000000010";
const sessionView: StudySessionView = {
  currentTaskIndex: 0,
  status: "ACTIVE",
  plan: {
    id: "00000000-0000-4000-8000-000000000100",
    profileId,
    durationMinutes: 30,
    createdAt: "2026-07-11T10:00:00.000Z",
    mode: "LESSON",
    lessonId: "letters-1",
    tasks: [{
      id: "task-1",
      stage: "LESSON",
      kind: "LESSON",
      atomIds: ["letter-ba"],
      prompt: "Write ba",
      promptArabic: "بَ",
      expectedAnswer: "ب",
      estimatedMinutes: 2,
      responseMode: "TYPE",
    }],
  },
};

beforeEach(async () => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  await closeOfflineDb();
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
});

it("restores the latest active cached lesson after a network start failure", async () => {
  window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
  await cacheSession(profileId, {
    id: sessionView.plan.id,
    ...sessionView,
    currentTaskIndex: 1,
    plan: {
      ...sessionView.plan,
      tasks: [
        ...sessionView.plan.tasks,
        { ...sessionView.plan.tasks[0], id: "task-2", prompt: "Write ba again" },
      ],
    },
  });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

  const session = renderHook(() => useLessonSession("letters-1"));
  await waitFor(() => expect(session.result.current.loading).toBe(false));

  expect(session.result.current.view?.currentTaskIndex).toBe(1);
  expect(session.result.current.currentTask?.id).toBe("task-2");
  expect(session.result.current.error).toBeNull();
});

it("advances locally and queues an attempt when the network is unavailable", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify(sessionView), { status: 201 }))
    .mockRejectedValueOnce(new TypeError("Failed to fetch"));
  const session = renderHook(() => useLessonSession("letters-1"));
  await waitFor(() => expect(session.result.current.currentTask).not.toBeNull());

  await act(async () => {
    await session.result.current.submitAttempt({
      answer: "ب",
      helpLevel: 0,
      attempted: true,
      startedAt: new Date().toISOString(),
      confidence: 4,
    });
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(session.result.current.view?.currentTaskIndex).toBe(1);
  expect(await listPendingMutations(profileId)).toHaveLength(1);
});

it("keeps the task in place for a server validation error", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify(sessionView), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Invalid attempt payload" }), { status: 400 }));
  const session = renderHook(() => useLessonSession("letters-1"));
  await waitFor(() => expect(session.result.current.currentTask).not.toBeNull());

  await act(async () => {
    await session.result.current.submitAttempt({
      answer: "ب",
      helpLevel: 0,
      attempted: true,
      startedAt: new Date().toISOString(),
      confidence: 4,
    });
  });

  expect(session.result.current.view?.currentTaskIndex).toBe(0);
  expect(session.result.current.error).toBe("Invalid attempt payload");
  expect(await listPendingMutations(profileId)).toHaveLength(0);
});

it("submits locally evaluated course metadata and completes the final step", async () => {
  const completed = { ...sessionView, currentTaskIndex: 1, status: "COMPLETE" as const };
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify(sessionView), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(completed), { status: 200 }));
  const session = renderHook(() => useLessonSession("rtl-baseline-lesson-1"));
  await waitFor(() => expect(session.result.current.currentTask).not.toBeNull());

  await act(async () => {
    await session.result.current.submitAttempt({
      answer: "ب", correct: true, errorClassification: null, hintUsed: false,
      exerciseType: "SCORED_TEST", responseMode: "TYPE", startedAt: new Date().toISOString(),
    });
  });

  const request = fetchMock.mock.calls[1]![1] as RequestInit;
  const body = JSON.parse(String(request.body));
  expect(body.event).toMatchObject({ curriculumVersion: 1, skillId: "rtl-baseline-skill-1", exerciseType: "SCORED_TEST", hintUsed: false, correct: true });
  expect(session.result.current.view?.status).toBe("COMPLETE");
});
