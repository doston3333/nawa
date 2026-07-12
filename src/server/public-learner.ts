import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { ensureProfile } from "@/server/repositories/study-repository";

export const PROFILE_COOKIE = "nawa_profile_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPublicDemoEnabled(): boolean {
  return process.env.ENABLE_PUBLIC_DEMO === "true" || process.env.ENABLE_DEMO_LEARNER === "true";
}

export function isProfileId(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Resolve an isolated public demo learner for this browser.
 * Each visitor gets a stable httpOnly cookie learner id so sessions never collide.
 */
export async function resolvePublicProfileId(): Promise<string> {
  if (!isPublicDemoEnabled()) {
    throw new Error("Public demo mode is disabled; Plan 2 account authentication is required");
  }

  const jar = await cookies();
  const existing = jar.get(PROFILE_COOKIE)?.value;
  if (isProfileId(existing)) {
    await ensureProfile(existing);
    return existing;
  }

  const profileId = randomUUID();
  await ensureProfile(profileId);
  jar.set(PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") === true,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return profileId;
}

/** Test and script helper: create a fresh profile without cookies. */
export async function createEphemeralProfileId(): Promise<string> {
  const profileId = randomUUID();
  await ensureProfile(profileId);
  return profileId;
}

/** Backwards-compatible aliases for existing demo callers. */
export const LEARNER_COOKIE = PROFILE_COOKIE;
export const isLearnerId = isProfileId;
export const resolvePublicLearnerId = resolvePublicProfileId;
export const createEphemeralLearnerId = createEphemeralProfileId;
