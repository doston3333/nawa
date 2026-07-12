import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  countMutations,
  createProfile,
  listProfileSessions,
  listProfiles,
  profileExists,
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

  it("rejects a replayed mutation id from another profile or device", async () => {
    const mutationId = randomUUID();
    const first = {
      mutationId,
      profileId: createdProfileIds[0]!,
      deviceId: randomUUID(),
    };
    await recordMutation(first);

    await expect(
      recordMutation({ ...first, profileId: createdProfileIds[1]! }),
    ).rejects.toThrow("Mutation ID already belongs to another profile or device");
    await expect(recordMutation({ ...first, deviceId: randomUUID() })).rejects.toThrow(
      "Mutation ID already belongs to another profile or device",
    );
  });

  it("rejects blank profile names", async () => {
    await expect(createProfile("   ")).rejects.toThrow("Profile name is required");
  });

  it("rejects profile names longer than 80 characters", async () => {
    await expect(createProfile("x".repeat(81))).rejects.toThrow(
      "Profile name must be 80 characters or fewer",
    );
  });

  it("only treats explicitly created profiles as selectable", async () => {
    expect(await profileExists(createdProfileIds[0]!)).toBe(true);
    expect(await profileExists(randomUUID())).toBe(false);
  });
});
