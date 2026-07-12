import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { pullChanges, pushMutations, SyncInputError, syncTestHooks, type SyncMutationInput } from "@/server/sync";

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
  syncTestHooks.beforePushCursor = undefined;
  await db.syncChange.deleteMany({ where: { profileId } });
  await db.syncMutation.deleteMany({ where: { profileId } });
  await db.evidenceEvent.deleteMany({ where: { profileId } });
  await db.masterySnapshot.deleteMany({ where: { profileId } });
  await db.lessonProgress.deleteMany({ where: { profileId } });
  await db.courseAttempt.deleteMany({ where: { profileId } });
  await db.courseReview.deleteMany({ where: { profileId } });
  await db.courseSkillProgress.deleteMany({ where: { profileId } });
  await db.courseEnrollment.deleteMany({ where: { profileId } });
  await db.studySession.update({ where: { id: sessionId }, data: { currentTaskIndex: 0, status: "ACTIVE" } });
});

afterAll(async () => {
  await db.profile.delete({ where: { id: profileId } });
  await db.$disconnect();
});

describe("idempotent synchronization", () => {
  it("rejects a course attempt for a lesson whose prerequisite skill is locked", async () => {
    const mutation: SyncMutationInput = {
      mutationId: randomUUID(), profileId, deviceId, kind: "COURSE_ATTEMPT", baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: { courseId: "pre-a1-v1", curriculumVersion: 1, lessonId: "rtl-baseline-lesson-2", skillId: "rtl-baseline-skill-2", exerciseType: "SORTING", correct: true, responseTimeMs: 100, hintUsed: false },
    };
    const result = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(result.acknowledgements[0]).toMatchObject({ status: "REJECTED", result: { error: expect.stringContaining("prerequisites") } });
    expect(await db.courseAttempt.count({ where: { profileId } })).toBe(0);
  });

  it("records a versioned lesson session attempt without writing legacy lesson progress", async () => {
    const versionedSessionId = randomUUID();
    await db.studySession.create({
      data: {
        id: versionedSessionId, profileId, durationMinutes: 30, courseId: "pre-a1-v1", curriculumVersion: 1,
        lessonId: "rtl-baseline-lesson-1",
        plan: { id: versionedSessionId, mode: "LESSON", lessonId: "rtl-baseline-lesson-1", tasks: [{ id: "versioned-task" }] },
        startedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
    });
    const mutation: SyncMutationInput = {
      mutationId: randomUUID(), profileId, deviceId, kind: "STUDY_ATTEMPT", baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: { sessionId: versionedSessionId, taskId: "versioned-task", nextTaskIndex: 1, event: event() },
    };
    const result = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(result.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.lessonProgress.count({ where: { profileId, lessonId: "rtl-baseline-lesson-1" } })).toBe(0);
    expect(await db.courseAttempt.count({ where: { profileId, lessonId: "rtl-baseline-lesson-1" } })).toBe(1);
  });

  it("projects a course attempt once when its stable mutation is replayed", async () => {
    const lessonId = "rtl-baseline-lesson-1";
    const skillId = "rtl-baseline-skill-1";
    const mutation: SyncMutationInput = {
      mutationId: randomUUID(), profileId, deviceId, kind: "COURSE_ATTEMPT", baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: {
        courseId: "pre-a1-v1", curriculumVersion: 1, lessonId, skillId,
        exerciseType: "MATCHING", correct: true, responseTimeMs: 350, hintUsed: false,
      },
    };
    const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const second = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(first.acknowledgements[0]).toMatchObject({ status: "ACKNOWLEDGED", result: { lessonId, skillId, exerciseType: "MATCHING" } });
    expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.courseAttempt.count({ where: { profileId, lessonId, skillId } })).toBe(1);
    const change = await db.syncChange.findFirst({ where: { profileId, entityType: "COURSE_ATTEMPT" }, orderBy: { id: "desc" } });
    expect(change?.payload).toMatchObject({ lessonId, skillId, curriculumVersion: 1 });
  });

  it("replaying a study attempt does not advance twice", async () => {
    const mutation = studyAttemptMutation();
    const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    const second = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.evidenceEvent.count({ where: { id: (mutation.payload as { event: { id: string } }).event.id } })).toBe(1);
    expect(await db.studySession.findUnique({ where: { id: sessionId } }).then((row) => row?.currentTaskIndex)).toBe(1);
    expect(first.cursor).toBe(second.cursor);
  });

  it("rejects replaying a mutation ID with different mutation data", async () => {
    const mutation = studyAttemptMutation();
    const first = await pushMutations({ profileId, deviceId, mutations: [mutation] });
    expect(first.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    const replay = { ...mutation, payload: { ...(mutation.payload as Record<string, unknown>), taskId: "task-1", nextTaskIndex: 1, event: { ...(mutation.payload as { event: object }).event, correct: false } } };
    const second = await pushMutations({ profileId, deviceId, mutations: [replay] });
    expect(second.acknowledgements[0]).toMatchObject({ status: "REJECTED", result: { code: "MUTATION_REPLAY_MISMATCH" } });
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

  it("does not let a concurrent same-profile change get skipped by the push cursor", async () => {
    let entered!: () => void;
    const enteredCursor = new Promise<void>((resolve) => { entered = resolve; });
    let release!: () => void;
    const releaseCursor = new Promise<void>((resolve) => { release = resolve; });
    syncTestHooks.beforePushCursor = async () => {
      entered();
      await releaseCursor;
    };

    const mutation = (lessonId: string): SyncMutationInput => ({
      mutationId: randomUUID(), profileId, deviceId, kind: "LESSON_PROGRESS", baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: { lessonId, correct: null, status: "IN_PROGRESS" },
    });
    const firstPromise = pushMutations({ profileId, deviceId, mutations: [mutation("script-1")] });
    await enteredCursor;
    const secondPromise = pushMutations({ profileId, deviceId, mutations: [mutation("script-2")] });

    // The second push must wait for the first transaction's cursor snapshot.
    // This also makes the test deterministic against the pre-fix interleaving,
    // where the second push could commit while the first read its cursor.
    await new Promise((resolve) => setTimeout(resolve, 50));
    release();
    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    syncTestHooks.beforePushCursor = undefined;

    expect(second.acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    const secondChange = await db.syncChange.findFirst({
      where: { profileId, entityId: `${profileId}:script-2` },
      select: { id: true },
    });
    expect(secondChange).not.toBeNull();
    const unseen = await pullChanges({ profileId, cursor: first.cursor });
    expect(unseen.changes.some((change) => change.id === secondChange!.id.toString())).toBe(true);
  });
});
