import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { profileExists } from "@/server/profile";
import { ensureProfile } from "@/server/repositories/study-repository";

export const PROFILE_COOKIE = "nawa_profile_id";
/** Historical cookie name retained so migrated anonymous progress stays reachable. */
export const LEARNER_COOKIE = "nawa_learner_id";

export const PROFILE_SELECTION_REQUIRED = "PROFILE_SELECTION_REQUIRED" as const;

/** Raised when a cookie cannot be mapped to an explicitly created profile. */
export class ProfileSelectionRequiredError extends Error {
  readonly code = PROFILE_SELECTION_REQUIRED;

  constructor() {
    super("Profile selection required");
    this.name = "ProfileSelectionRequiredError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPublicDemoEnabled(): boolean {
  return process.env.ENABLE_PUBLIC_DEMO === "true" || process.env.ENABLE_DEMO_LEARNER === "true";
}

export function isProfileId(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_RE.test(value);
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
 * Existing profile and legacy learner cookies are migrated in place so sessions never collide.
 */
export async function resolvePublicProfileId(): Promise<string> {
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

/** Test and script helper: create a fresh profile without cookies. */
export async function createEphemeralProfileId(): Promise<string> {
  const profileId = randomUUID();
  await ensureProfile(profileId);
  return profileId;
}

/** Backwards-compatible aliases for existing demo callers. */
export const isLearnerId = isProfileId;
export const resolvePublicLearnerId = resolvePublicProfileId;
export const createEphemeralLearnerId = createEphemeralProfileId;
