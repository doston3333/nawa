import { Prisma } from "../src/generated/prisma/client";
import { BEGINNER_ATOMS } from "../src/domain/curriculum/seed";
import { db } from "../src/server/db";

const learnerId = process.env.DEMO_LEARNER_ID ?? "00000000-0000-4000-8000-000000000001";

async function main() {
  await db.learner.upsert({ where: { id: learnerId }, update: {}, create: { id: learnerId } });
  for (const atom of BEGINNER_ATOMS) {
    const payload = atom as unknown as Prisma.InputJsonValue;
    await db.knowledgeAtomRecord.upsert({
      where: { id: atom.id },
      update: { payload },
      create: { id: atom.id, payload },
    });
  }
}

main().then(() => db.$disconnect()).catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
