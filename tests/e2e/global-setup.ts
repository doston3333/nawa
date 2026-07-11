import { db } from "../../src/server/db";

export default async function globalSetup() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("E2E reset cannot run in production");
  }
  // Cookie-isolated learners accumulate during local runs; clear session state only.
  await db.evidenceEvent.deleteMany();
  await db.studySession.deleteMany();
  await db.masterySnapshot.deleteMany();
  await db.$disconnect();
}
