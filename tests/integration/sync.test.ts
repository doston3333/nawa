import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { pullChanges, pushMutations, type SyncMutationInput } from "@/server/sync";

describe("sync integration", () => {
  const profileId = randomUUID();
  const deviceId = randomUUID();
  const sessionId = randomUUID();
  const eventId = randomUUID();
  const mutationId = randomUUID();

  beforeAll(async () => {
    await db.profile.create({ data: { id: profileId, name: "Integration sync" } });
    await db.device.create({ data: { id: deviceId, profileId, label: "Integration sync device" } });
    await db.studySession.create({
      data: {
        id: sessionId, profileId, durationMinutes: 30,
        plan: { id: sessionId, mode: "STUDY_ROOM", tasks: [{ id: "task-1" }] },
        startedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
    });
  });
  afterAll(async () => {
    await db.profile.delete({ where: { id: profileId } });
    await db.$disconnect();
  });

  it("acknowledges and replays one study attempt", async () => {
    const mutation: SyncMutationInput = {
      mutationId, profileId, deviceId, kind: "STUDY_ATTEMPT", baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: {
        sessionId, taskId: "task-1", nextTaskIndex: 1,
        event: {
          id: eventId, profileId, atomId: "letter-ba", ability: "WRITING",
          occurredAt: "2026-07-12T00:00:00.000Z", correct: true, responseMode: "TYPE",
          helpLevel: 0, latencyMs: 100, confidence: 4, novelContext: false, analysisConfidence: null,
        },
      },
    };
    const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const second = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(first.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.evidenceEvent.count({ where: { id: eventId } })).toBe(1);
    expect(await db.syncMutation.count({ where: { mutationId } })).toBe(1);
    expect(first.cursor).toBe(second.cursor);
    expect((await pullChanges({ profileId, cursor: "MA" })).changes).toHaveLength(1);
  });
});
