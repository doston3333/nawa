import { expect, it, vi } from "vitest";
import { POST } from "./route";
import {
  advanceSession,
  assertSessionOwnedBy,
  getAbilityCounts,
  recordEvidence,
} from "@/server/repositories/study-repository";

vi.mock("@/server/profile", () => ({
  resolveProfileId: vi.fn(async () => "00000000-0000-4000-8000-000000000001"),
}));
vi.mock("@/server/repositories/study-repository", () => ({
  recordEvidence: vi.fn(),
  advanceSession: vi.fn(),
  getAbilityCounts: vi.fn(),
  assertSessionOwnedBy: vi.fn(),
}));
vi.mock("@/server/repositories/lesson-repository", () => ({
  recordLessonAttemptScore: vi.fn(),
  completeLessonAfterSession: vi.fn(async () => ({ completed: false, nextLessonId: null, passed: false })),
}));
vi.mock("@/server/db", () => ({
  db: {
    studySession: {
      findUnique: vi.fn(async () => null),
    },
  },
}));

it("records one ability-specific event before advancing", async () => {
  vi.mocked(assertSessionOwnedBy).mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000100",
    profileId: "00000000-0000-4000-8000-000000000001",
    durationMinutes: 30,
    createdAt: "2026-07-11T10:00:00.000Z",
    tasks: [],
    mode: "STUDY_ROOM",
  });
  vi.mocked(recordEvidence).mockResolvedValue({
    profileId: "00000000-0000-4000-8000-000000000001",
    atomId: "letter-ba",
    ability: "WRITING",
    state: "RETRIEVED",
    successfulRetrievals: 1,
    lastAttemptAt: "2026-07-11T10:06:00.000Z",
    lastSuccessfulRetrievalAt: "2026-07-11T10:06:00.000Z",
    nextReviewAt: "2026-07-13T10:06:00.000Z",
  });
  vi.mocked(getAbilityCounts).mockResolvedValue({
    READING: 8,
    LISTENING: 5,
    WRITING: 3,
    SPEAKING: 2,
  });
  const body = {
    taskId: "concept-1",
    nextTaskIndex: 3,
    event: {
      id: "00000000-0000-4000-8000-000000000200",
      profileId: "00000000-0000-4000-8000-000000000001",
      atomId: "letter-ba",
      ability: "WRITING",
      occurredAt: "2026-07-11T10:06:00.000Z",
      correct: true,
      responseMode: "TYPE",
      helpLevel: 0,
      latencyMs: 1800,
      confidence: 4,
      novelContext: false,
      analysisConfidence: null,
    },
  };
  const response = await POST(new Request("http://nawa.test", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ sessionId: "00000000-0000-4000-8000-000000000100" }),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).mastery.ability).toBe("WRITING");
  expect(assertSessionOwnedBy).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000100",
    "00000000-0000-4000-8000-000000000001",
  );
  expect(advanceSession).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000100",
    3,
    "00000000-0000-4000-8000-000000000001",
  );
});
