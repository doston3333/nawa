import { beforeEach, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("@/server/db", () => ({
  db: { $queryRaw: (...args: unknown[]) => queryRaw(...args) },
}));

vi.mock("@/server/public-learner", () => ({
  isPublicDemoEnabled: () => true,
}));

beforeEach(() => {
  queryRaw.mockReset();
  queryRaw.mockResolvedValue([{ "?column?": 1 }]);
});

it("reports healthy when database and demo mode are up", async () => {
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ ok: true, db: true, demo: true });
});
