import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { resolveProfileId } from "@/server/profile";
import { pullChanges, SyncInputError } from "@/server/sync";

vi.mock("@/server/profile", () => ({
  resolveProfileId: vi.fn(),
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {},
}));
vi.mock("@/server/sync", () => ({
  pullChanges: vi.fn(),
  SyncInputError: class SyncInputError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

const profileId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveProfileId).mockResolvedValue(profileId);
  vi.mocked(pullChanges).mockResolvedValue({ changes: [], cursor: "MA", hasMore: false });
});

it("returns 400 for malformed or foreign cursors", async () => {
  vi.mocked(pullChanges).mockRejectedValue(new SyncInputError("INVALID_CURSOR", "invalid cursor"));
  const response = await GET(new Request("http://nawa.test/api/sync/pull?cursor=bad"));
  expect(response.status).toBe(400);
});

it("passes the selected profile cursor to the bounded pull service", async () => {
  const response = await GET(new Request("http://nawa.test/api/sync/pull?cursor=MA"));
  expect(response.status).toBe(200);
  expect(pullChanges).toHaveBeenCalledWith({ profileId, cursor: "MA" });
});
