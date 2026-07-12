import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const profileId = "00000000-0000-4000-8000-000000000010";
const deviceId = "00000000-0000-4000-8000-000000000011";

vi.mock("@/server/profile", () => ({
  resolveProfileId: vi.fn(),
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {},
}));
vi.mock("@/server/device", () => ({ registerDevice: vi.fn() }));

import { resolveProfileId } from "@/server/profile";
import { registerDevice } from "@/server/device";

beforeEach(() => vi.clearAllMocks());

it("registers a browser device for the selected profile", async () => {
  vi.mocked(resolveProfileId).mockResolvedValue(profileId);
  vi.mocked(registerDevice).mockResolvedValue({ id: deviceId, profileId, label: "Browser" });
  const response = await POST(new Request("http://nawa.test/api/sync/devices", {
    method: "POST",
    body: JSON.stringify({ deviceId, label: "Browser" }),
  }));
  expect(response.status).toBe(201);
  expect(registerDevice).toHaveBeenCalledWith({ profileId, deviceId, label: "Browser" });
  await expect(response.json()).resolves.toMatchObject({ id: deviceId, profileId });
});

it("rejects malformed registration payloads", async () => {
  const response = await POST(new Request("http://nawa.test/api/sync/devices", {
    method: "POST",
    body: JSON.stringify({ label: "Browser" }),
  }));
  expect(response.status).toBe(400);
});
