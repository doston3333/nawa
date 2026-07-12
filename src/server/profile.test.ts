import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  countMutations,
  createProfile,
  listProfileSessions,
  listProfiles,
  recordMutation,
} from "@/server/profile";

const createdProfileIds: string[] = [];

beforeAll(async () => {
  const first = await createProfile("First");
  const second = await createProfile("Second");
  createdProfileIds.push(first.id, second.id);
  await db.studySession.create({
    data: {
      id: randomUUID(),
      profileId: first.id,
      durationMinutes: 30,
      plan: {},
      startedAt: new Date("2026-07-12T00:00:00.000Z"),
    },
  });
});

afterAll(async () => {
  await db.profile.deleteMany({ where: { id: { in: createdProfileIds } } });
  await db.$disconnect();
});

describe("profile ownership and sync ledger", () => {
  it("lists named profiles and keeps profile-owned sessions isolated", async () => {
    const profiles = await listProfiles();
    expect(profiles.filter((profile) => createdProfileIds.includes(profile.id)).map((p) => p.name)).toEqual([
      "First",
      "Second",
    ]);

    expect(await listProfileSessions(createdProfileIds[1]!)).toEqual([]);
    expect(await listProfileSessions(createdProfileIds[0]!)).toHaveLength(1);
  });

  it("stores one sync mutation for a replayed mutation id", async () => {
    const mutation = {
      mutationId: randomUUID(),
      profileId: createdProfileIds[0]!,
      deviceId: randomUUID(),
      kind: "lesson.progress",
      payload: { lessonId: "script-1" },
    };
    await recordMutation(mutation);
    await recordMutation(mutation);
    expect(await countMutations(mutation.mutationId)).toBe(1);
  });
});

