import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { startLessonSession } from "@/server/repositories/lesson-repository";

vi.mock("@/server/profile", () => ({
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {
    readonly code = "PROFILE_SELECTION_REQUIRED";
  },
  resolveProfileId: vi.fn(),
}));

vi.mock("@/server/repositories/lesson-repository", () => ({
  startLessonSession: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
  clientIpFromRequest: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/server/log", () => ({
  logEvent: vi.fn(),
  logLearnerRef: (value: string) => value,
}));

beforeEach(() => vi.clearAllMocks());

it("returns profile-selection-required before starting a lesson", async () => {
  vi.mocked(resolveProfileId).mockRejectedValue(new ProfileSelectionRequiredError());

  const response = await POST(new Request("http://nawa.test/api/learn/lessons/lesson-1/start", { method: "POST" }), {
    params: Promise.resolve({ lessonId: "lesson-1" }),
  });

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ code: "PROFILE_SELECTION_REQUIRED" });
  expect(startLessonSession).not.toHaveBeenCalled();
});

it("returns 503 when starting the lesson fails after selection", async () => {
  vi.mocked(resolveProfileId).mockResolvedValue("00000000-0000-4000-8000-000000000001");
  vi.mocked(startLessonSession).mockRejectedValue(new Error("database unavailable"));

  const response = await POST(new Request("http://nawa.test/api/learn/lessons/lesson-1/start", { method: "POST" }), {
    params: Promise.resolve({ lessonId: "lesson-1" }),
  });

  expect(response.status).toBe(503);
});
