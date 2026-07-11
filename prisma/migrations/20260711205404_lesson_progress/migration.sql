-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'COMPLETE');

-- CreateTable
CREATE TABLE "LessonProgress" (
    "learnerId" UUID NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'AVAILABLE',
    "scoreCorrect" INTEGER NOT NULL DEFAULT 0,
    "scoreTotal" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("learnerId","lessonId")
);

-- CreateIndex
CREATE INDEX "LessonProgress_learnerId_status_idx" ON "LessonProgress"("learnerId", "status");

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
