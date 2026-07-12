import { beforeEach, expect, it, vi } from "vitest";

const jar = { set: vi.fn(), get: vi.fn() };
const profileFindUnique = vi.fn();

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => jar) }));
vi.mock("@/server/db", () => ({ db: { profile: { findUnique: profileFindUnique } } }));
vi.mock("@/server/repositories/study-repository", () => ({ ensureProfile: vi.fn() }));

beforeEach(() => {
  jar.set.mockReset();
  profileFindUnique.mockReset();
  profileFindUnique.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" });
});

it("sets the profile cookie with private-app flags and a 400-day lifetime", async () => {
  const { selectProfile } = await import("./profile");
  await selectProfile("00000000-0000-4000-8000-000000000001");
  expect(jar.set).toHaveBeenCalledWith(
    "nawa_profile_id",
    "00000000-0000-4000-8000-000000000001",
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      secure: false,
    }),
  );
});

it("requires explicit selection when no profile cookie is present", async () => {
  const { ProfileSelectionRequiredError, resolveProfileId } = await import("./profile");
  jar.get.mockReturnValue(undefined);
  await expect(resolveProfileId()).rejects.toBeInstanceOf(ProfileSelectionRequiredError);
  expect(profileFindUnique).not.toHaveBeenCalled();
});

it("does not create a profile for an unknown profile cookie", async () => {
  const { ProfileSelectionRequiredError, resolveProfileId } = await import("./profile");
  const staleId = "00000000-0000-4000-8000-000000000099";
  jar.get.mockImplementation((name: string) =>
    name === "nawa_profile_id" ? { name, value: staleId } : undefined,
  );
  profileFindUnique.mockResolvedValue(null);
  await expect(resolveProfileId()).rejects.toBeInstanceOf(ProfileSelectionRequiredError);
  expect(profileFindUnique).toHaveBeenCalledWith({ where: { id: staleId }, select: { id: true } });
  expect(jar.set).not.toHaveBeenCalled();
});
