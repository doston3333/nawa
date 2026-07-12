import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { StudySession } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { ensureProfile } from "@/server/repositories/study-repository";

export type ProfileSummary = {
  id: string;
  name: string;
};

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

export async function createProfile(name: string): Promise<ProfileSummary> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Profile name is required");
  }
  if (trimmedName.length > 80) {
    throw new Error("Profile name must be 80 characters or fewer");
  }

  return db.profile.create({
    data: { id: randomUUID(), name: trimmedName },
    select: { id: true, name: true },
  });
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  return db.profile.findMany({
    select: { id: true, name: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function profileExists(profileId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  return profile !== null;
}

/** Resolve the explicitly selected profile for the current browser. */
export async function resolveProfileId(): Promise<string> {
  const jar = await cookies();
  const selected = jar.get(PROFILE_COOKIE)?.value;
  if (isProfileId(selected) && (await profileExists(selected))) {
    return selected;
  }

  const legacy = jar.get(LEARNER_COOKIE)?.value;
  if (isProfileId(legacy) && (await profileExists(legacy))) {
    // Legacy anonymous progress was migrated to Profile rows in Task 1. Keep
    // the same UUID and promote it into the new cookie boundary.
    await ensureProfile(legacy);
    setProfileCookie(jar, legacy);
    return legacy;
  }

  throw new ProfileSelectionRequiredError();
}

/** Select an existing named profile for this browser. */
export async function selectProfile(profileId: string): Promise<void> {
  if (!isProfileId(profileId) || !(await profileExists(profileId))) {
    throw new ProfileSelectionRequiredError();
  }
  const jar = await cookies();
  setProfileCookie(jar, profileId);
}

export async function listProfileSessions(profileId: string): Promise<StudySession[]> {
  return db.studySession.findMany({ where: { profileId }, orderBy: { updatedAt: "desc" } });
}

export type MutationInput = {
  mutationId: string;
  profileId: string;
  deviceId: string;
  kind?: string;
  payload?: unknown;
};

export async function recordMutation(input: MutationInput) {
  const validateOwnership = (stored: { profileId: string; deviceId: string }) => {
    if (stored.profileId !== input.profileId || stored.deviceId !== input.deviceId) {
      throw new Error("Mutation ID already belongs to another profile or device");
    }
  };

  const existing = await db.syncMutation.findUnique({ where: { mutationId: input.mutationId } });
  if (existing) {
    validateOwnership(existing);
    return existing;
  }

  try {
    return await db.syncMutation.create({
      data: {
        mutationId: input.mutationId,
        profileId: input.profileId,
        deviceId: input.deviceId,
        kind: input.kind ?? "UNKNOWN",
        payload: (input.payload ?? {}) as object,
      },
    });
  } catch (error) {
    // Another request may have won the unique mutationId race. Re-read it and
    // enforce the same ownership check instead of returning another profile's row.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const raced = await db.syncMutation.findUnique({ where: { mutationId: input.mutationId } });
      if (raced) {
        validateOwnership(raced);
        return raced;
      }
    }
    throw error;
  }
}

export async function countMutations(mutationId: string): Promise<number> {
  return db.syncMutation.count({ where: { mutationId } });
}
