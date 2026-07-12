import { randomUUID } from "node:crypto";
import type { StudySession } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type ProfileSummary = {
  id: string;
  name: string;
  createdAt: Date;
};

export async function createProfile(name: string): Promise<ProfileSummary> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Profile name is required");
  }

  return db.profile.create({
    data: { id: randomUUID(), name: trimmedName },
    select: { id: true, name: true, createdAt: true },
  });
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  return db.profile.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
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
