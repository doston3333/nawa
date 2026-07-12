import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { ProfileSelectionRequiredError, selectProfile } from "@/server/profile";

vi.mock("@/server/profile", () => ({
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {},
  selectProfile: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it("selects an existing profile", async () => {
  const response = await POST(
    new Request("http://nawa.test/api/profile/select", {
      method: "POST",
      body: JSON.stringify({ profileId: "00000000-0000-4000-8000-000000000001" }),
    }),
  );
  expect(response.status).toBe(200);
  expect(selectProfile).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
});

it("returns 400 for an unknown profile and 5xx for storage failures", async () => {
  vi.mocked(selectProfile).mockRejectedValueOnce(new ProfileSelectionRequiredError());
  const unknown = await POST(
    new Request("http://nawa.test/api/profile/select", {
      method: "POST",
      body: JSON.stringify({ profileId: "00000000-0000-4000-8000-000000000001" }),
    }),
  );
  expect(unknown.status).toBe(400);

  vi.mocked(selectProfile).mockRejectedValueOnce(new Error("database unavailable"));
  const failed = await POST(
    new Request("http://nawa.test/api/profile/select", {
      method: "POST",
      body: JSON.stringify({ profileId: "00000000-0000-4000-8000-000000000001" }),
    }),
  );
  expect(failed.status).toBe(503);
});
