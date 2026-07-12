import { afterEach, expect, it, vi } from "vitest";

const cookieStore = {
  profile: undefined as string | undefined,
  legacy: undefined as string | undefined,
  get(name: string) {
    const value = name === "nawa_profile_id" ? this.profile : name === "nawa_learner_id" ? this.legacy : undefined;
    return value ? { name, value } : undefined;
  },
  set(name: string, value: string) {
    if (name === "nawa_profile_id") this.profile = value;
    if (name === "nawa_learner_id") this.legacy = value;
  },
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/server/profile", () => ({
  profileExists: vi.fn(async () => true),
  resolveProfileId: vi.fn(),
  isProfileId: (value: string | undefined | null) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  PROFILE_COOKIE: "nawa_profile_id",
  LEARNER_COOKIE: "nawa_learner_id",
  PROFILE_SELECTION_REQUIRED: "PROFILE_SELECTION_REQUIRED",
  ProfileSelectionRequiredError: class ProfileSelectionRequiredError extends Error {
    readonly code = "PROFILE_SELECTION_REQUIRED";
  },
}));

vi.mock("@/server/repositories/study-repository", () => ({
  ensureProfile: vi.fn(async () => undefined),
}));

afterEach(() => {
  cookieStore.profile = undefined;
  cookieStore.legacy = undefined;
  vi.clearAllMocks();
});

it("keeps resolvePublicLearnerId as a strict profile resolver alias", async () => {
  const { resolvePublicLearnerId } = await import("./public-learner");
  const { resolveProfileId } = await import("@/server/profile");
  vi.mocked(resolveProfileId).mockResolvedValue("00000000-0000-4000-8000-000000000121");

  await expect(resolvePublicLearnerId()).resolves.toBe("00000000-0000-4000-8000-000000000121");
  expect(resolvePublicLearnerId).toBe(resolveProfileId);
});

it("issues distinct cookie-bound learners only through the explicitly named legacy demo helper", async () => {
  const { resolveLegacyPublicDemoProfileId, isPublicDemoEnabled } = await import("./public-learner");
  process.env.ENABLE_PUBLIC_DEMO = "true";
  expect(isPublicDemoEnabled()).toBe(true);

  const first = await resolveLegacyPublicDemoProfileId();
  expect(first).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(cookieStore.profile).toBe(first);

  const sameVisitor = await resolveLegacyPublicDemoProfileId();
  expect(sameVisitor).toBe(first);

  cookieStore.profile = undefined;
  const secondVisitor = await resolveLegacyPublicDemoProfileId();
  expect(secondVisitor).not.toBe(first);
});

it("promotes the legacy learner cookie without issuing a new profile id", async () => {
  const { resolveLegacyPublicDemoProfileId } = await import("./public-learner");
  process.env.ENABLE_PUBLIC_DEMO = "true";
  const legacyId = "00000000-0000-4000-8000-000000000123";
  cookieStore.legacy = legacyId;

  const resolved = await resolveLegacyPublicDemoProfileId();

  expect(resolved).toBe(legacyId);
  expect(cookieStore.profile).toBe(legacyId);
});

it("rejects an unknown current profile cookie without creating a profile", async () => {
  const { resolveLegacyPublicDemoProfileId, ProfileSelectionRequiredError } = await import("./public-learner");
  const { ensureProfile } = await import("@/server/repositories/study-repository");
  const { profileExists } = await import("@/server/profile");
  process.env.ENABLE_PUBLIC_DEMO = "true";
  const staleId = "00000000-0000-4000-8000-000000000124";
  cookieStore.profile = staleId;
  vi.mocked(profileExists).mockResolvedValue(false);

  await expect(resolveLegacyPublicDemoProfileId()).rejects.toBeInstanceOf(ProfileSelectionRequiredError);
  expect(ensureProfile).not.toHaveBeenCalled();
  expect(cookieStore.profile).toBe(staleId);
});

it("rejects an unknown legacy learner cookie without creating a profile", async () => {
  const { resolveLegacyPublicDemoProfileId, ProfileSelectionRequiredError } = await import("./public-learner");
  const { ensureProfile } = await import("@/server/repositories/study-repository");
  const { profileExists } = await import("@/server/profile");
  process.env.ENABLE_PUBLIC_DEMO = "true";
  const staleId = "00000000-0000-4000-8000-000000000125";
  cookieStore.legacy = staleId;
  vi.mocked(profileExists).mockResolvedValue(false);

  await expect(resolveLegacyPublicDemoProfileId()).rejects.toBeInstanceOf(ProfileSelectionRequiredError);
  expect(ensureProfile).not.toHaveBeenCalled();
  expect(cookieStore.profile).toBeUndefined();
});
