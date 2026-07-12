import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as pushRoute } from "@/app/api/sync/push/route";
import { db } from "@/server/db";
import { resolveProfileId } from "@/server/profile";
import { pullChanges, pushMutations, type SyncMutationInput } from "@/server/sync";

vi.mock("@/server/profile", async () => {
  const actual = await vi.importActual<typeof import("@/server/profile")>("@/server/profile");
  return { ...actual, resolveProfileId: vi.fn() };
});

describe("sync integration", () => {
  const profileId = randomUUID();
  const deviceId = randomUUID();
  const secondDeviceId = randomUUID();
  const sessionId = randomUUID();
  const eventId = randomUUID();
  const mutationId = randomUUID();
  const httpSessionId = randomUUID();
  const httpEventId = randomUUID();
  const httpMutationId = randomUUID();

  beforeAll(async () => {
    vi.mocked(resolveProfileId).mockResolvedValue(profileId);
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
    await db.studySession.create({
      data: {
        id: httpSessionId,
        profileId,
        durationMinutes: 30,
        plan: {
          id: httpSessionId,
          profileId,
          mode: "LESSON",
          lessonId: "script-1",
          tasks: [{ id: "http-task-1", atomIds: ["letter-ba"], expectedAnswer: "ب" }],
        },
        startedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
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

  it("replays duplicate mutations through the HTTP route exactly once", async () => {
    const mutation: SyncMutationInput = {
      mutationId: httpMutationId,
      profileId,
      deviceId,
      kind: "STUDY_ATTEMPT",
      baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: {
        sessionId: httpSessionId,
        taskId: "http-task-1",
        nextTaskIndex: 1,
        event: {
          id: httpEventId,
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
    const body = JSON.stringify({ deviceId, mutations: [mutation] });
    const first = await pushRoute(new Request("http://nawa.test/api/sync/push", { method: "POST", body }));
    const second = await pushRoute(new Request("http://nawa.test/api/sync/push", { method: "POST", body }));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).acknowledgements[0]).toMatchObject({ mutationId: httpMutationId, status: "ACKNOWLEDGED" });
    expect((await second.json()).acknowledgements[0]).toMatchObject({ mutationId: httpMutationId, status: "ACKNOWLEDGED" });
    expect(await db.evidenceEvent.count({ where: { id: httpEventId } })).toBe(1);
    expect(await db.syncMutation.count({ where: { mutationId: httpMutationId } })).toBe(1);
  });

  it("accepts same-profile pushes from both registered devices", async () => {
    const secondSessionId = randomUUID();
    const thirdSessionId = randomUUID();
    const secondMutationId = randomUUID();
    const secondEventId = randomUUID();
    await db.studySession.create({
      data: {
        id: secondSessionId,
        profileId,
        durationMinutes: 30,
        plan: {
          id: secondSessionId,
          profileId,
          mode: "LESSON",
          lessonId: "script-1",
          tasks: [{ id: "second-device-task", atomIds: ["letter-ta"], expectedAnswer: "ت" }],
        },
        startedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
    });
    await db.studySession.create({
      data: {
        id: thirdSessionId,
        profileId,
        durationMinutes: 30,
        plan: {
          id: thirdSessionId,
          profileId,
          mode: "LESSON",
          lessonId: "script-1",
          tasks: [{ id: "third-device-task", atomIds: ["letter-ta"], expectedAnswer: "ت" }],
        },
        startedAt: new Date("2026-07-12T00:00:00.000Z"),
      },
    });
    const makeMutation = (sessionId: string, mutationId: string, eventId: string, taskId: string, atomId: string, answer: string, pushDeviceId: string): SyncMutationInput => ({
      mutationId,
      profileId,
      deviceId: pushDeviceId,
      kind: "STUDY_ATTEMPT",
      baseRevision: null,
      createdAt: "2026-07-12T00:00:00.000Z",
      payload: {
        sessionId,
        taskId,
        nextTaskIndex: 1,
        event: {
          id: eventId,
          profileId,
          atomId,
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
    });
    const firstMutation = makeMutation(secondSessionId, randomUUID(), randomUUID(), "second-device-task", "letter-ta", "ت", deviceId);
    const secondMutation = makeMutation(thirdSessionId, secondMutationId, secondEventId, "third-device-task", "letter-ta", "ت", secondDeviceId);
    const firstResponse = await pushRoute(new Request("http://nawa.test/api/sync/push", { method: "POST", body: JSON.stringify({ deviceId, mutations: [firstMutation] }) }));
    const secondResponse = await pushRoute(new Request("http://nawa.test/api/sync/push", { method: "POST", body: JSON.stringify({ deviceId: secondDeviceId, mutations: [secondMutation] }) }));
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect((await firstResponse.json()).acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect((await secondResponse.json()).acknowledgements[0]?.status).toBe("ACKNOWLEDGED");
    expect(await db.syncMutation.findUnique({ where: { mutationId: secondMutationId }, select: { deviceId: true } })).toMatchObject({ deviceId: secondDeviceId });
  });
});
