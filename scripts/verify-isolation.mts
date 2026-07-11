/**
 * Gating isolation probe: two real learners, independent session plans.
 * Run: pnpm exec tsx scripts/verify-isolation.mts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  advanceSession,
  ensureLearner,
  startOrResumeSession,
} from "../src/server/repositories/study-repository";
import { db } from "../src/server/db";

const learnerA = randomUUID();
const learnerB = randomUUID();

async function main() {
  await ensureLearner(learnerA);
  await ensureLearner(learnerB);

  const a1 = await startOrResumeSession({
    learnerId: learnerA,
    durationMinutes: 30,
    now: new Date().toISOString(),
  });
  await advanceSession(a1.plan.id, 2, learnerA);

  const b1 = await startOrResumeSession({
    learnerId: learnerB,
    durationMinutes: 30,
    now: new Date().toISOString(),
  });

  const a2 = await startOrResumeSession({
    learnerId: learnerA,
    durationMinutes: 30,
    now: new Date().toISOString(),
  });

  const ok =
    a1.plan.id !== b1.plan.id &&
    b1.currentTaskIndex === 0 &&
    a2.plan.id === a1.plan.id &&
    a2.currentTaskIndex === 2 &&
    a1.plan.learnerId === learnerA &&
    b1.plan.learnerId === learnerB;

  console.log(
    JSON.stringify(
      {
        ok,
        learnerA,
        learnerB,
        aSession: a1.plan.id,
        bSession: b1.plan.id,
        aTaskIndex: a2.currentTaskIndex,
        bTaskIndex: b1.currentTaskIndex,
        stagesA: a1.plan.tasks.map((t) => t.stage),
      },
      null,
      2,
    ),
  );

  for (const learnerId of [learnerA, learnerB]) {
    await db.evidenceEvent.deleteMany({ where: { learnerId } });
    await db.studySession.deleteMany({ where: { learnerId } });
    await db.masterySnapshot.deleteMany({ where: { learnerId } });
    await db.learner.deleteMany({ where: { id: learnerId } });
  }
  await db.$disconnect();
  if (!ok) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
