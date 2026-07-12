/**
 * Gating isolation probe: two real profiles, independent session plans.
 * Run: pnpm exec tsx scripts/verify-isolation.mts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  advanceSession,
  ensureProfile,
  startOrResumeSession,
} from "../src/server/repositories/study-repository";
import { db } from "../src/server/db";

const profileA = randomUUID();
const profileB = randomUUID();

async function main() {
  await ensureProfile(profileA);
  await ensureProfile(profileB);

  const a1 = await startOrResumeSession({
    profileId: profileA,
    durationMinutes: 30,
    now: new Date().toISOString(),
  });
  await advanceSession(a1.plan.id, 2, profileA);

  const b1 = await startOrResumeSession({
    profileId: profileB,
    durationMinutes: 30,
    now: new Date().toISOString(),
  });

  const a2 = await startOrResumeSession({
    profileId: profileA,
    durationMinutes: 30,
    now: new Date().toISOString(),
  });

  const ok =
    a1.plan.id !== b1.plan.id &&
    b1.currentTaskIndex === 0 &&
    a2.plan.id === a1.plan.id &&
    a2.currentTaskIndex === 2 &&
    a1.plan.profileId === profileA &&
    b1.plan.profileId === profileB;

  console.log(
    JSON.stringify(
      {
        ok,
        profileA,
        profileB,
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

  for (const profileId of [profileA, profileB]) {
    await db.evidenceEvent.deleteMany({ where: { profileId } });
    await db.studySession.deleteMany({ where: { profileId } });
    await db.masterySnapshot.deleteMany({ where: { profileId } });
    await db.profile.deleteMany({ where: { id: profileId } });
  }
  await db.$disconnect();
  if (!ok) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
