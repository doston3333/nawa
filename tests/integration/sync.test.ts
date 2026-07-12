import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { pullChanges, pushMutations, type SyncMutationInput } from "@/server/sync";

describe("sync integration", () => {
  const profileId = randomUUID();
  const deviceId = randomUUID();
  const secondDeviceId = randomUUID();
  const sessionId = randomUUID();
  const eventId = randomUUID();
  const mutationId = randomUUID();

  beforeAll(async () => {
    await db.profile.create({ data: { id: profileId, name: "Sync integration" } });
    await db.device.createMany({
      data: [
        { id: deviceId, profileId, label: "Integration laptop" },
        { id: secondDeviceId, profileId, label: "Integration phone" },
      ],
    });
    await db.studySession.create({
      data: {
        id: sessionId,
        profileId,
        durationMinutes: 30,
        plan: {
          id: sessionId,
          profileId,
          mode: "LESSON",
          lessonId: "script-1",
          tasks: [{ id: "task-1", atomIds: ["letter-ba"], expectedAnswer: "ب" }],
        },
        startedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
    });
    await db.lessonProgress.create({
      data: { profileId, lessonId: "script-1", status: "IN_PROGRESS" },
    });
  });

  afterAll(async () => {
    await db.profile.delete({ where: { id: profileId } });
    await db.$disconnect();
  });

  it("acknowledges duplicate lesson attempts exactly once", async () => {
    const mutation: SyncMutationInput = {
      mutationId,
      profileId,
      deviceId,
      kind: "STUDY_ATTEMPT",
      baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: {
        sessionId,
        taskId: "task-1",
        nextTaskIndex: 1,
        event: {
          id: eventId,
          profileId,
          atomId: "letter-ba",
          ability: "WRITING",
          occurredAt: "2026-07-12T00:00:00.000Z",
          correct: true,
          responseMode: "TYPE",
          helpLevel: 0,
          latencyMs: 100,
          confidence: 4,
          novelContext: false,
          analysisConfidence: null,
        },
      },
    };

    const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const second = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const [session, progress] = await Promise.all([
      db.studySession.findUnique({ where: { id: sessionId }, select: { currentTaskIndex: true, status: true } }),
      db.lessonProgress.findUnique({ where: { profileId_lessonId: { profileId, lessonId: "script-1" } } }),
    ]);

    expect(first.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.evidenceEvent.count({ where: { id: eventId } })).toBe(1);
    expect(await db.syncMutation.count({ where: { mutationId } })).toBe(1);
    expect(session).toMatchObject({ currentTaskIndex: 1, status: "COMPLETE" });
    expect(progress).toMatchObject({ scoreCorrect: 1, scoreTotal: 1, status: "COMPLETE" });
    expect(first.cursor).toBe(second.cursor);
    expect((await pullChanges({ profileId, cursor: "MA" })).changes).toHaveLength(1);
  });
});
