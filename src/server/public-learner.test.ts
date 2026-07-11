import { afterEach, expect, it, vi } from "vitest";

const cookieStore = {
  value: undefined as string | undefined,
  get(name: string) {
    if (name !== "nawa_learner_id") return undefined;
    return this.value ? { name, value: this.value } : undefined;
  },
  set(name: string, value: string) {
    if (name === "nawa_learner_id") this.value = value;
  },
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/server/repositories/study-repository", () => ({
  ensureLearner: vi.fn(async () => undefined),
}));

afterEach(() => {
  cookieStore.value = undefined;
  vi.clearAllMocks();
});

it("issues distinct cookie-bound learners for separate visitors", async () => {
  const { resolvePublicLearnerId, isPublicDemoEnabled } = await import("./public-learner");
  process.env.ENABLE_PUBLIC_DEMO = "true";
  expect(isPublicDemoEnabled()).toBe(true);

  const first = await resolvePublicLearnerId();
  expect(first).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(cookieStore.value).toBe(first);

  const sameVisitor = await resolvePublicLearnerId();
  expect(sameVisitor).toBe(first);

  cookieStore.value = undefined;
  const secondVisitor = await resolvePublicLearnerId();
  expect(secondVisitor).not.toBe(first);
});
