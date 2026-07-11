import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { advanceSession, recordEvidence, startOrResumeSession } from "@/server/repositories/study-repository";

const learnerId = "00000000-0000-4000-8000-000000000001";

async function resetLearnerState() {
  await db.evidenceEvent.deleteMany({ where: { learnerId } });
  await db.studySession.deleteMany({ where: { learnerId } });
  await db.masterySnapshot.deleteMany({ where: { learnerId } });
}

beforeAll(async () => {
  await db.learner.upsert({ where: { id: learnerId }, update: {}, create: { id: learnerId } });
  await resetLearnerState();
});

beforeEach(async () => {
  await resetLearnerState();
});

afterEach(async () => {
  await resetLearnerState();
});

afterAll(() => db.$disconnect());

it("resumes the active session and derives mastery from one immutable event", async () => {
  const first = await startOrResumeSession({ learnerId, durationMinutes: 30, now: "2026-07-11T10:00:00.000Z" });
  await advanceSession(first.plan.id, 2);
  const resumed = await startOrResumeSession({ learnerId, durationMinutes: 30, now: "2026-07-11T10:05:00.000Z" });
  expect(resumed.plan.id).toBe(first.plan.id);
  expect(resumed.currentTaskIndex).toBe(2);

  const mastery = await recordEvidence({
    sessionId: first.plan.id,
    taskId: "concept-1",
    event: {
      id: randomUUID(), learnerId, atomId: "letter-ba", ability: "WRITING",
      occurredAt: "2026-07-11T10:06:00.000Z", correct: true, responseMode: "TYPE",
      helpLevel: 0, latencyMs: 1800, confidence: 4, novelContext: false, analysisConfidence: null,
    },
  });
  expect(mastery.state).toBe("RETRIEVED");
  expect(await db.evidenceEvent.count({ where: { learnerId } })).toBe(1);
});
