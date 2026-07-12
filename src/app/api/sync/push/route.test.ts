import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { resolveProfileId } from "@/server/profile";
import { db } from "@/server/db";
import { pushMutations, SyncInputError } from "@/server/sync";

vi.mock("@/server/profile", () => ({
  resolveProfileId: vi.fn(),
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {},
}));
vi.mock("@/server/db", () => ({ db: { device: { findUnique: vi.fn() } } }));
vi.mock("@/server/sync", () => ({
  pushMutations: vi.fn(),
  SyncInputError: class SyncInputError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

const profileId = "00000000-0000-4000-8000-000000000001";
const deviceId = "00000000-0000-4000-8000-000000000002";
const mutation = (overrides: Record<string, unknown> = {}) => ({
  mutationId: "00000000-0000-4000-8000-000000000003",
  profileId,
  deviceId,
  kind: "LESSON_PROGRESS",
  baseRevision: null,
  createdAt: "2026-07-12T00:00:00.000Z",
  payload: { lessonId: "unit-1-lesson-1", correct: true },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveProfileId).mockResolvedValue(profileId);
  vi.mocked(db.device.findUnique).mockResolvedValue({ profileId } as never);
  vi.mocked(pushMutations).mockResolvedValue({ acknowledgements: [], cursor: "MA" });
});

it("rejects a push over the 50-mutation limit", async () => {
  const response = await POST(new Request("http://nawa.test/api/sync/push", {
    method: "POST",
    body: JSON.stringify({ deviceId, mutations: Array.from({ length: 51 }, (_, index) => mutation({ mutationId: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}` })) }),
  }));
  expect(response.status).toBe(400);
  expect(pushMutations).not.toHaveBeenCalled();
});

it("requires a body device and rejects profile/device mismatches", async () => {
  const missingDevice = await POST(new Request("http://nawa.test/api/sync/push", {
    method: "POST", body: JSON.stringify({ mutations: [mutation()] }),
  }));
  expect(missingDevice.status).toBe(400);

  const profileMismatch = await POST(new Request("http://nawa.test/api/sync/push", {
    method: "POST", body: JSON.stringify({ deviceId, mutations: [mutation({ profileId: "00000000-0000-4000-8000-000000000099" })] }),
  }));
  expect(profileMismatch.status).toBe(403);

  const deviceMismatch = await POST(new Request("http://nawa.test/api/sync/push", {
    method: "POST", body: JSON.stringify({ deviceId, mutations: [mutation({ deviceId: "00000000-0000-4000-8000-000000000099" })] }),
  }));
  expect(deviceMismatch.status).toBe(403);
});

it("maps domain payload rejection to 400", async () => {
  vi.mocked(pushMutations).mockRejectedValue(new SyncInputError("INVALID_PAYLOAD", "invalid payload"));
  const response = await POST(new Request("http://nawa.test/api/sync/push", {
    method: "POST", body: JSON.stringify({ deviceId, mutations: [mutation()] }),
  }));
  expect(response.status).toBe(400);
});
