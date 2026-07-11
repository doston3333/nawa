import "dotenv/config";
import { Prisma } from "../src/generated/prisma/client";
import { BEGINNER_ATOMS } from "../src/domain/curriculum/seed";
import { db } from "../src/server/db";

async function main() {
  for (const atom of BEGINNER_ATOMS) {
    const payload = atom as unknown as Prisma.InputJsonValue;
    await db.knowledgeAtomRecord.upsert({
      where: { id: atom.id },
      update: { payload },
      create: { id: atom.id, payload },
    });
  }
  console.log(`Seeded ${BEGINNER_ATOMS.length} curriculum atoms.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exitCode = 1;
  });
