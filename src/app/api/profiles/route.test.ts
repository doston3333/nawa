import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { createProfile, listProfiles } from "@/server/profile";

vi.mock("@/server/profile", () => ({
  createProfile: vi.fn(),
  listProfiles: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it("lists profiles", async () => {
  vi.mocked(listProfiles).mockResolvedValue([{ id: "p1", name: "Amina" }]);
  const response = await GET();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ profiles: [{ id: "p1", name: "Amina" }] });
});

it("creates a trimmed profile with 201", async () => {
  vi.mocked(createProfile).mockResolvedValue({ id: "p1", name: "Amina" });
  const response = await POST(
    new Request("http://nawa.test/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "  Amina  " }),
    }),
  );
  expect(response.status).toBe(201);
  expect(createProfile).toHaveBeenCalledWith("Amina");
  await expect(response.json()).resolves.toEqual({ id: "p1", name: "Amina" });
});

it("rejects blank and oversized names with 400", async () => {
  const blank = await POST(
    new Request("http://nawa.test/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    }),
  );
  expect(blank.status).toBe(400);

  vi.mocked(createProfile).mockRejectedValue(new Error("Profile name must be 80 characters or fewer"));
  const oversized = await POST(
    new Request("http://nawa.test/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "x".repeat(81) }),
    }),
  );
  expect(oversized.status).toBe(400);
});

it("returns 5xx when profile storage fails", async () => {
  vi.mocked(listProfiles).mockRejectedValue(new Error("database unavailable"));
  const response = await GET();
  expect(response.status).toBe(503);

  vi.mocked(createProfile).mockRejectedValue(new Error("database unavailable"));
  const createResponse = await POST(
    new Request("http://nawa.test/api/profiles", {
      method: "POST",
      body: JSON.stringify({ name: "Amina" }),
    }),
  );
  expect(createResponse.status).toBe(503);
});
