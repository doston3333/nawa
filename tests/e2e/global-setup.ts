import { db } from "../../src/server/db";

export default async function globalSetup() {
  if (process.env.NODE_ENV === "production") throw new Error("E2E reset cannot run in production");
  const learnerId = process.env.DEMO_LEARNER_ID ?? "00000000-0000-4000-8000-000000000001";
  await db.evidenceEvent.deleteMany({ where: { learnerId } });
  await db.studySession.deleteMany({ where: { learnerId } });
  await db.masterySnapshot.deleteMany({ where: { learnerId } });
  await db.learner.upsert({ where: { id: learnerId }, update: {}, create: { id: learnerId } });
  await db.$disconnect();
}
