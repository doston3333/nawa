-- CreateEnum
CREATE TYPE "Ability" AS ENUM ('READING', 'LISTENING', 'WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "MasteryState" AS ENUM ('ENCOUNTERED', 'RECOGNIZED', 'RETRIEVED', 'APPLIED', 'RETAINED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETE');

-- CreateTable
CREATE TABLE "Learner" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeAtomRecord" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "KnowledgeAtomRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterySnapshot" (
    "learnerId" UUID NOT NULL,
    "atomId" TEXT NOT NULL,
    "ability" "Ability" NOT NULL,
    "state" "MasteryState" NOT NULL,
    "successfulRetrievals" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessfulRetrievalAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterySnapshot_pkey" PRIMARY KEY ("learnerId","atomId","ability")
);

-- CreateTable
CREATE TABLE "EvidenceEvent" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "taskId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "ability" "Ability" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "responseMode" TEXT NOT NULL,
    "helpLevel" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "novelContext" BOOLEAN NOT NULL,
    "analysisConfidence" DOUBLE PRECISION,

    CONSTRAINT "EvidenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "currentTaskIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasterySnapshot_learnerId_nextReviewAt_idx" ON "MasterySnapshot"("learnerId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "EvidenceEvent_learnerId_atomId_ability_occurredAt_idx" ON "EvidenceEvent"("learnerId", "atomId", "ability", "occurredAt");

-- CreateIndex
CREATE INDEX "StudySession_learnerId_status_updatedAt_idx" ON "StudySession"("learnerId", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "MasterySnapshot" ADD CONSTRAINT "MasterySnapshot_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceEvent" ADD CONSTRAINT "EvidenceEvent_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceEvent" ADD CONSTRAINT "EvidenceEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
