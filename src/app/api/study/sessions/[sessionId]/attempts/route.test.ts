import { expect, it, vi } from "vitest";
import { POST } from "./route";
import {
  advanceSession,
  assertSessionOwnedBy,
  getAbilityCounts,
  recordEvidence,
} from "@/server/repositories/study-repository";

vi.mock("@/server/public-learner", () => ({
  resolvePublicLearnerId: vi.fn(async () => "00000000-0000-4000-8000-000000000001"),
}));
vi.mock("@/server/repositories/study-repository", () => ({
  recordEvidence: vi.fn(),
  advanceSession: vi.fn(),
  getAbilityCounts: vi.fn(),
  assertSessionOwnedBy: vi.fn(),
}));

it("records one ability-specific event before advancing", async () => {
  vi.mocked(recordEvidence).mockResolvedValue({
    learnerId: "00000000-0000-4000-8000-000000000001",
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
      learnerId: "00000000-0000-4000-8000-000000000001",
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
  expect(advanceSession).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000100", 3, "00000000-0000-4000-8000-000000000001");
});
