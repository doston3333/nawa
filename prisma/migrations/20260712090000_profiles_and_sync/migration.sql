-- Rename the existing ownership root and preserve every UUID/timestamp.
ALTER TABLE "Learner" RENAME TO "Profile";
ALTER TABLE "Profile" ADD COLUMN "name" TEXT;
WITH ranked AS (
  SELECT "id", 'Learner ' || row_number() OVER (ORDER BY "createdAt", "id") AS "name"
  FROM "Profile"
)
UPDATE "Profile" AS p
SET "name" = ranked."name"
FROM ranked
WHERE p."id" = ranked."id";
ALTER TABLE "Profile" ALTER COLUMN "name" SET NOT NULL;

-- Replace learnerId with profileId on every owned learning record.
ALTER TABLE "MasterySnapshot" DROP CONSTRAINT IF EXISTS "MasterySnapshot_learnerId_fkey";
ALTER TABLE "EvidenceEvent" DROP CONSTRAINT IF EXISTS "EvidenceEvent_learnerId_fkey";
ALTER TABLE "StudySession" DROP CONSTRAINT IF EXISTS "StudySession_learnerId_fkey";
ALTER TABLE "LessonProgress" DROP CONSTRAINT IF EXISTS "LessonProgress_learnerId_fkey";

DROP INDEX IF EXISTS "MasterySnapshot_learnerId_nextReviewAt_idx";
DROP INDEX IF EXISTS "EvidenceEvent_learnerId_atomId_ability_occurredAt_idx";
DROP INDEX IF EXISTS "StudySession_learnerId_status_updatedAt_idx";
DROP INDEX IF EXISTS "LessonProgress_learnerId_status_idx";

ALTER TABLE "MasterySnapshot" RENAME COLUMN "learnerId" TO "profileId";
ALTER TABLE "EvidenceEvent" RENAME COLUMN "learnerId" TO "profileId";
ALTER TABLE "StudySession" RENAME COLUMN "learnerId" TO "profileId";
ALTER TABLE "LessonProgress" RENAME COLUMN "learnerId" TO "profileId";

ALTER TABLE "MasterySnapshot"
  ADD CONSTRAINT "MasterySnapshot_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceEvent"
  ADD CONSTRAINT "EvidenceEvent_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudySession"
  ADD CONSTRAINT "StudySession_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress"
  ADD CONSTRAINT "LessonProgress_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MasterySnapshot_profileId_nextReviewAt_idx"
  ON "MasterySnapshot"("profileId", "nextReviewAt");
CREATE INDEX "EvidenceEvent_profileId_atomId_ability_occurredAt_idx"
  ON "EvidenceEvent"("profileId", "atomId", "ability", "occurredAt");
CREATE INDEX "StudySession_profileId_status_updatedAt_idx"
  ON "StudySession"("profileId", "status", "updatedAt");
CREATE INDEX "LessonProgress_profileId_status_idx"
  ON "LessonProgress"("profileId", "status");

CREATE TABLE "Device" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Device_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Device_profileId_lastSeenAt_idx" ON "Device"("profileId", "lastSeenAt");

CREATE TABLE "SyncMutation" (
  "mutationId" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "deviceId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACKNOWLEDGED',
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncMutation_pkey" PRIMARY KEY ("mutationId"),
  CONSTRAINT "SyncMutation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SyncMutation_profileId_createdAt_idx" ON "SyncMutation"("profileId", "createdAt");

CREATE TABLE "SyncChange" (
  "id" BIGSERIAL NOT NULL,
  "profileId" UUID NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SyncChange_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SyncChange_profileId_id_idx" ON "SyncChange"("profileId", "id");
CREATE INDEX "SyncChange_profileId_entityType_entityId_revision_idx"
  ON "SyncChange"("profileId", "entityType", "entityId", "revision");
