import { db } from "../../src/server/db";

export const E2E_PROFILES = {
  amina: "00000000-0000-4000-8000-0000000000a1",
  omar: "00000000-0000-4000-8000-0000000000b1",
} as const;

export const E2E_DEVICES = {
  aminaLaptop: "00000000-0000-4000-8000-0000000000a2",
  aminaPhone: "00000000-0000-4000-8000-0000000000a3",
} as const;

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
  await db.syncChange.deleteMany();
  await db.syncMutation.deleteMany();
  await db.profile.upsert({
    where: { id: E2E_PROFILES.amina },
    update: { name: "Amina" },
    create: { id: E2E_PROFILES.amina, name: "Amina" },
  });
  await db.profile.upsert({
    where: { id: E2E_PROFILES.omar },
    update: { name: "Omar" },
    create: { id: E2E_PROFILES.omar, name: "Omar" },
  });
  await db.device.deleteMany({ where: { profileId: E2E_PROFILES.amina } });
  await db.device.createMany({
    data: [
      { id: E2E_DEVICES.aminaLaptop, profileId: E2E_PROFILES.amina, label: "Amina laptop" },
      { id: E2E_DEVICES.aminaPhone, profileId: E2E_PROFILES.amina, label: "Amina phone" },
    ],
  });
  await db.$disconnect();
}
