import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  LEARNER_COOKIE as PROFILE_LEARNER_COOKIE,
  PROFILE_COOKIE as PROFILE_SELECTION_COOKIE,
  PROFILE_SELECTION_REQUIRED,
  ProfileSelectionRequiredError,
  isProfileId,
  profileExists,
  resolveProfileId,
} from "@/server/profile";
import { ensureProfile } from "@/server/repositories/study-repository";

export const PROFILE_COOKIE = PROFILE_SELECTION_COOKIE;
/** Historical cookie name retained so migrated anonymous progress stays reachable. */
export const LEARNER_COOKIE = PROFILE_LEARNER_COOKIE;
export { PROFILE_SELECTION_REQUIRED, ProfileSelectionRequiredError };

export function isPublicDemoEnabled(): boolean {
  return process.env.ENABLE_PUBLIC_DEMO === "true" || process.env.ENABLE_DEMO_LEARNER === "true";
}

function setProfileCookie(jar: Awaited<ReturnType<typeof cookies>>, profileId: string): void {
  jar.set(PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") === true,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}

/**
 * Resolve an isolated public demo profile for this browser.
 *
 * This is retained only for explicitly enabled legacy demo callers. Active
 * learning routes use the strict `resolvePublicLearnerId` compatibility alias
 * below, which never creates a profile implicitly.
 */
export async function resolveLegacyPublicDemoProfileId(): Promise<string> {
  if (!isPublicDemoEnabled()) {
    throw new Error("Public demo mode is disabled; Plan 2 account authentication is required");
  }

  const jar = await cookies();
  const existing = jar.get(PROFILE_COOKIE)?.value;
  if (isProfileId(existing) && (await profileExists(existing))) {
    await ensureProfile(existing);
    return existing;
  }

  const legacy = jar.get(LEARNER_COOKIE)?.value;
  if (isProfileId(legacy) && (await profileExists(legacy))) {
    await ensureProfile(legacy);
    setProfileCookie(jar, legacy);
    return legacy;
  }

  // A cookie value means a profile was previously selected. Do not turn a
  // forged, stale, or malformed value into a new blank profile through the
  // ensureProfile upsert. The profile-picker route can recover explicitly.
  if (existing !== undefined || legacy !== undefined) {
    throw new ProfileSelectionRequiredError();
  }

  const profileId = randomUUID();
  await ensureProfile(profileId);
  setProfileCookie(jar, profileId);
  return profileId;
}

/** @deprecated Use resolveLegacyPublicDemoProfileId only for legacy demo tooling. */
export const resolvePublicProfileId = resolveLegacyPublicDemoProfileId;

/** Test and script helper: create a fresh profile without cookies. */
export async function createEphemeralProfileId(): Promise<string> {
  const profileId = randomUUID();
  await ensureProfile(profileId);
  return profileId;
}

/** Backwards-compatible aliases for existing callers. */
export const isLearnerId = isProfileId;
/** Strict profile-selection compatibility alias; never creates a random profile. */
export const resolvePublicLearnerId = resolveProfileId;
export const createEphemeralLearnerId = createEphemeralProfileId;
