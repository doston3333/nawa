import { db } from "../../src/server/db";

export default async function globalSetup() {
  // Guard accidental use against a production database URL, not local NODE_ENV leftovers.
  if (process.env.E2E_ALLOW_DB_RESET !== "true" && process.env.NODE_ENV === "production" && !process.env.DATABASE_URL?.includes("localhost") && !process.env.DATABASE_URL?.includes("127.0.0.1")) {
    throw new Error("E2E reset cannot run against a non-local production database");
  }
  // Cookie-isolated learners accumulate during local runs; clear session state only.
  await db.evidenceEvent.deleteMany();
  await db.studySession.deleteMany();
  await db.masterySnapshot.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.$disconnect();
}
