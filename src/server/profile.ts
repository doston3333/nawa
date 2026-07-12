import { randomUUID } from "node:crypto";
import type { StudySession } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type ProfileSummary = {
  id: string;
  name: string;
  createdAt: Date;
};

export async function createProfile(name: string): Promise<ProfileSummary> {
  return db.profile.create({
    data: { id: randomUUID(), name: name.trim() || "Personal profile" },
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
  return db.syncMutation.upsert({
    where: { mutationId: input.mutationId },
    update: {},
    create: {
      mutationId: input.mutationId,
      profileId: input.profileId,
      deviceId: input.deviceId,
      kind: input.kind ?? "UNKNOWN",
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function countMutations(mutationId: string): Promise<number> {
  return db.syncMutation.count({ where: { mutationId } });
}

