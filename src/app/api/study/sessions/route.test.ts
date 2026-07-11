import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { startOrResumeSession } from "@/server/repositories/study-repository";

vi.mock("@/server/demo-learner", () => ({ getDemoLearnerId: () => "00000000-0000-4000-8000-000000000001" }));
vi.mock("@/server/repositories/study-repository", () => ({ startOrResumeSession: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("starts a validated 30-minute session", async () => {
  vi.mocked(startOrResumeSession).mockResolvedValue({
    currentTaskIndex: 0,
    status: "ACTIVE",
    plan: {
      id: "00000000-0000-4000-8000-000000000100",
      learnerId: "00000000-0000-4000-8000-000000000001",
      durationMinutes: 30,
      createdAt: "2026-07-11T10:00:00.000Z",
      tasks: ["ARRIVAL", "RETRIEVAL", "NEW_CONCEPT", "INPUT", "OUTPUT", "CLOSE"].map((stage, index) => ({
        id: `task-${index}`, stage: stage as "ARRIVAL", kind: "CALIBRATION", atomIds: [],
        prompt: stage, promptArabic: null, expectedAnswer: null, estimatedMinutes: 5,
      })),
    },
  });
  const response = await POST(new Request("http://nawa.test/api/study/sessions", {
    method: "POST", body: JSON.stringify({ durationMinutes: 30 }),
  }));
  expect(response.status).toBe(201);
  expect((await response.json()).plan.tasks.map((task: { stage: string }) => task.stage)).toEqual([
    "ARRIVAL", "RETRIEVAL", "NEW_CONCEPT", "INPUT", "OUTPUT", "CLOSE",
  ]);
});
