import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { advanceSession, ensureProfile, startOrResumeSession } from "@/server/repositories/study-repository";

const profileA = randomUUID();
const profileB = randomUUID();

beforeAll(async () => {
  await ensureProfile(profileA);
  await ensureProfile(profileB);
});

afterAll(async () => {
  for (const profileId of [profileA, profileB]) {
    await db.evidenceEvent.deleteMany({ where: { profileId } });
    await db.studySession.deleteMany({ where: { profileId } });
    await db.masterySnapshot.deleteMany({ where: { profileId } });
    await db.profile.deleteMany({ where: { id: profileId } });
  }
  await db.$disconnect();
});

it("keeps concurrent visitors on isolated study sessions", async () => {
  const firstA = await startOrResumeSession({
    profileId: profileA,
    durationMinutes: 30,
    now: "2026-07-12T00:00:00.000Z",
  });
  await advanceSession(firstA.plan.id, 2, profileA);

  const firstB = await startOrResumeSession({
    profileId: profileB,
    durationMinutes: 30,
    now: "2026-07-12T00:01:00.000Z",
  });

  expect(firstB.plan.id).not.toBe(firstA.plan.id);
  expect(firstB.plan.profileId).toBe(profileB);
  expect(firstB.currentTaskIndex).toBe(0);

  const resumedA = await startOrResumeSession({
    profileId: profileA,
    durationMinutes: 30,
    now: "2026-07-12T00:02:00.000Z",
  });
  expect(resumedA.plan.id).toBe(firstA.plan.id);
  expect(resumedA.currentTaskIndex).toBe(2);
  expect(resumedA.plan.profileId).toBe(profileA);

  const resumedB = await startOrResumeSession({
    profileId: profileB,
    durationMinutes: 30,
    now: "2026-07-12T00:03:00.000Z",
  });
  expect(resumedB.plan.id).toBe(firstB.plan.id);
  expect(resumedB.currentTaskIndex).toBe(0);
});
