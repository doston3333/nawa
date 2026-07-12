import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { pullChanges, pushMutations, SyncInputError, type SyncMutationInput } from "@/server/sync";

const profileId = randomUUID();
const deviceId = randomUUID();
let sessionId = "";

const event = () => ({
  id: randomUUID(), profileId, atomId: "letter-ba", ability: "WRITING" as const,
  occurredAt: "2026-07-12T00:00:00.000Z", correct: true, responseMode: "TYPE" as const,
  helpLevel: 0 as const, latencyMs: 100, confidence: 4 as const, novelContext: false, analysisConfidence: null,
});

function studyAttemptMutation(): SyncMutationInput {
  const nextEvent = event();
  return {
    mutationId: randomUUID(), profileId, deviceId, kind: "STUDY_ATTEMPT", baseRevision: null,
    createdAt: "2026-07-12T00:00:00.000Z",
    payload: { sessionId, taskId: "task-1", nextTaskIndex: 1, event: nextEvent },
  };
}

beforeAll(async () => {
  await db.profile.create({ data: { id: profileId, name: "Sync test" } });
  await db.device.create({ data: { id: deviceId, profileId, label: "Sync test device" } });
  sessionId = randomUUID();
  await db.studySession.create({
    data: {
      id: sessionId, profileId, durationMinutes: 30,
      plan: { id: sessionId, mode: "STUDY_ROOM", tasks: [{ id: "task-1" }] },
      startedAt: new Date("2026-07-12T00:00:00.000Z"),
    },
  });
});

beforeEach(async () => {
  await db.syncChange.deleteMany({ where: { profileId } });
  await db.syncMutation.deleteMany({ where: { profileId } });
  await db.evidenceEvent.deleteMany({ where: { profileId } });
  await db.masterySnapshot.deleteMany({ where: { profileId } });
  await db.studySession.update({ where: { id: sessionId }, data: { currentTaskIndex: 0, status: "ACTIVE" } });
});

afterAll(async () => {
  await db.profile.delete({ where: { id: profileId } });
  await db.$disconnect();
});

describe("idempotent synchronization", () => {
  it("replaying a study attempt does not advance twice", async () => {
    const mutation = studyAttemptMutation();
    const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const second = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.evidenceEvent.count({ where: { id: (mutation.payload as { event: { id: string } }).event.id } })).toBe(1);
    expect(await db.studySession.findUnique({ where: { id: sessionId } }).then((row) => row?.currentTaskIndex)).toBe(1);
    expect(first.cursor).toBe(second.cursor);
  });

  it("rejects an attempt event for a different profile", async () => {
    const mutation = studyAttemptMutation();
    const payload = mutation.payload as { event: { profileId: string } };
    payload.event.profileId = randomUUID();
    const result = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(result.acknowledgements[0]?.status).toBe("REJECTED");
    expect(await db.evidenceEvent.count({ where: { profileId } })).toBe(0);
  });

  it("pulls changes after an opaque cursor", async () => {
    const mutation = studyAttemptMutation();
    const pushed = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const pulled = await pullChanges({ profileId, cursor: "MA" });
    expect(pulled.changes).toHaveLength(1);
    expect(pulled.cursor).toBe(pushed.cursor);
    expect((pulled.changes[0]?.payload as { mastery: unknown }).mastery).toBeTruthy();
  });

  it("rejects malformed and foreign cursors", async () => {
    await expect(pullChanges({ profileId, cursor: "not-a-cursor" })).rejects.toBeInstanceOf(SyncInputError);
    const foreign = Buffer.from(`${randomUUID()}:999`, "utf8").toString("base64url");
    await expect(pullChanges({ profileId, cursor: foreign })).rejects.toMatchObject({ code: "INVALID_CURSOR" });
  });

  it("rejects an attempt task that is not in the stored plan", async () => {
    const mutation = studyAttemptMutation();
    mutation.payload = { ...(mutation.payload as object), taskId: "unknown-task" };
    const result = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(result.acknowledgements[0]).toMatchObject({ status: "REJECTED" });
    expect(await db.evidenceEvent.count({ where: { profileId } })).toBe(0);
  });

  it("serializes concurrent attempts for one session", async () => {
    const first = studyAttemptMutation();
    const second = studyAttemptMutation();
    const results = await Promise.all([
      pushMutations({ profileId, deviceId, mutations: [first] }),
      pushMutations({ profileId, deviceId, mutations: [second] }),
    ]);
    expect(results.filter((result) => result.acknowledgements[0]?.status === "ACKNOWLEDGED")).toHaveLength(1);
    expect(results.filter((result) => result.acknowledgements[0]?.status === "REJECTED")).toHaveLength(1);
    expect(await db.evidenceEvent.count({ where: { profileId } })).toBe(1);
    expect(await db.studySession.findUnique({ where: { id: sessionId } }).then((row) => row?.currentTaskIndex)).toBe(1);
  });
});
