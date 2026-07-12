import { expect, it, vi } from "vitest";
import { GET } from "./route";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { getLearnPath } from "@/server/repositories/lesson-repository";

vi.mock("@/server/profile", () => ({
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {
    readonly code = "PROFILE_SELECTION_REQUIRED";
  },
  resolveProfileId: vi.fn(),
}));
vi.mock("@/server/repositories/lesson-repository", () => ({ getLearnPath: vi.fn() }));

it("returns a profile-selection response instead of creating an implicit profile", async () => {
  vi.mocked(resolveProfileId).mockRejectedValue(new ProfileSelectionRequiredError());
  const response = await GET();
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ code: "PROFILE_SELECTION_REQUIRED" });
  expect(getLearnPath).not.toHaveBeenCalled();
});

it("returns 5xx when loading the path fails after selection", async () => {
  vi.mocked(resolveProfileId).mockResolvedValue("00000000-0000-4000-8000-000000000001");
  vi.mocked(getLearnPath).mockRejectedValue(new Error("database unavailable"));
  const response = await GET();
  expect(response.status).toBe(503);
});
