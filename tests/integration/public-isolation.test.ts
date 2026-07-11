import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import {
  advanceSession,
  ensureLearner,
  startOrResumeSession,
} from "@/server/repositories/study-repository";

const learnerA = randomUUID();
const learnerB = randomUUID();

beforeAll(async () => {
  await ensureLearner(learnerA);
  await ensureLearner(learnerB);
});

afterAll(async () => {
  for (const learnerId of [learnerA, learnerB]) {
    await db.evidenceEvent.deleteMany({ where: { learnerId } });
    await db.studySession.deleteMany({ where: { learnerId } });
    await db.masterySnapshot.deleteMany({ where: { learnerId } });
    await db.learner.deleteMany({ where: { id: learnerId } });
  }
  await db.$disconnect();
});

it("keeps concurrent visitors on isolated study sessions", async () => {
  const firstA = await startOrResumeSession({
    learnerId: learnerA,
    durationMinutes: 30,
    now: "2026-07-12T00:00:00.000Z",
  });
  await advanceSession(firstA.plan.id, 2, learnerA);

  const firstB = await startOrResumeSession({
    learnerId: learnerB,
    durationMinutes: 30,
    now: "2026-07-12T00:01:00.000Z",
  });

  expect(firstB.plan.id).not.toBe(firstA.plan.id);
  expect(firstB.plan.learnerId).toBe(learnerB);
  expect(firstB.currentTaskIndex).toBe(0);

  const resumedA = await startOrResumeSession({
    learnerId: learnerA,
    durationMinutes: 30,
    now: "2026-07-12T00:02:00.000Z",
  });
  expect(resumedA.plan.id).toBe(firstA.plan.id);
  expect(resumedA.currentTaskIndex).toBe(2);
  expect(resumedA.plan.learnerId).toBe(learnerA);

  const resumedB = await startOrResumeSession({
    learnerId: learnerB,
    durationMinutes: 30,
    now: "2026-07-12T00:03:00.000Z",
  });
  expect(resumedB.plan.id).toBe(firstB.plan.id);
  expect(resumedB.currentTaskIndex).toBe(0);
});
