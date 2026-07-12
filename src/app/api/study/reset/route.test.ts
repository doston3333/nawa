import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { ProfileSelectionRequiredError, resolveProfileId, selectProfile } from "@/server/profile";
import { db } from "@/server/db";
import { ensureProfile } from "@/server/repositories/study-repository";

vi.mock("@/server/profile", () => ({
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {
    readonly code = "PROFILE_SELECTION_REQUIRED";
  },
  resolveProfileId: vi.fn(),
  selectProfile: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    studySession: { updateMany: vi.fn() },
  },
}));

vi.mock("@/server/repositories/study-repository", () => ({
  ensureProfile: vi.fn(),
}));

vi.mock("@/server/log", () => ({
  logEvent: vi.fn(),
  logLearnerRef: (value: string) => value,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.studySession.updateMany).mockResolvedValue({ count: 0 });
  vi.mocked(ensureProfile).mockResolvedValue(undefined);
  vi.mocked(selectProfile).mockResolvedValue(undefined);
});

it("starts a fresh profile when no profile is selected", async () => {
  vi.mocked(resolveProfileId).mockRejectedValue(new ProfileSelectionRequiredError());

  const response = await POST();

  expect(response.status).toBe(200);
  expect(ensureProfile).toHaveBeenCalledOnce();
  expect(selectProfile).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/i));
  expect(db.studySession.updateMany).not.toHaveBeenCalled();
});

it("returns 503 when closing the selected profile fails", async () => {
  vi.mocked(resolveProfileId).mockResolvedValue("00000000-0000-4000-8000-000000000001");
  vi.mocked(db.studySession.updateMany).mockRejectedValue(new Error("database unavailable"));

  const response = await POST();

  expect(response.status).toBe(503);
  expect(ensureProfile).not.toHaveBeenCalled();
  expect(selectProfile).not.toHaveBeenCalled();
});
