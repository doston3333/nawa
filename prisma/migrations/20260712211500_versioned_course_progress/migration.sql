-- Additive course persistence. Legacy lesson progress and evidence remain intact.
ALTER TABLE "EvidenceEvent"
  ADD COLUMN "curriculumVersion" INTEGER,
  ADD COLUMN "skillId" TEXT,
  ADD COLUMN "exerciseType" TEXT,
  ADD COLUMN "responseTimeMs" INTEGER,
  ADD COLUMN "hintUsed" BOOLEAN,
  ADD COLUMN "errorClassification" TEXT,
  ADD COLUMN "handwritingMetrics" JSONB;

ALTER TABLE "StudySession"
  ADD COLUMN "courseId" TEXT,
  ADD COLUMN "curriculumVersion" INTEGER,
  ADD COLUMN "lessonId" TEXT;
CREATE INDEX "StudySession_profileId_courseId_curriculumVersion_lessonId_status_idx"
  ON "StudySession"("profileId", "courseId", "curriculumVersion", "lessonId", "status");

CREATE TABLE "CourseEnrollment" (
  "profileId" UUID NOT NULL,
  "courseId" TEXT NOT NULL,
  "curriculumVersion" INTEGER NOT NULL,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("profileId", "courseId", "curriculumVersion"),
  CONSTRAINT "CourseEnrollment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CourseSkillProgress" (
  "profileId" UUID NOT NULL,
  "courseId" TEXT NOT NULL,
  "curriculumVersion" INTEGER NOT NULL,
  "skillId" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "masteredAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseSkillProgress_pkey" PRIMARY KEY ("profileId", "courseId", "curriculumVersion", "skillId"),
  CONSTRAINT "CourseSkillProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CourseSkillProgress_profileId_courseId_curriculumVersion_status_idx" ON "CourseSkillProgress"("profileId", "courseId", "curriculumVersion", "status");

CREATE TABLE "CourseReview" (
  "profileId" UUID NOT NULL,
  "courseId" TEXT NOT NULL,
  "curriculumVersion" INTEGER NOT NULL,
  "skillId" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "lastReviewedAt" TIMESTAMP(3),
  CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("profileId", "courseId", "curriculumVersion", "skillId"),
  CONSTRAINT "CourseReview_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CourseReview_profileId_dueAt_idx" ON "CourseReview"("profileId", "dueAt");

CREATE TABLE "CourseAttempt" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "courseId" TEXT NOT NULL,
  "curriculumVersion" INTEGER NOT NULL,
  "lessonId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "exerciseType" TEXT NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "responseTimeMs" INTEGER NOT NULL,
  "hintUsed" BOOLEAN NOT NULL DEFAULT false,
  "errorClassification" TEXT,
  "handwritingMetrics" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseAttempt_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CourseAttempt_profileId_courseId_curriculumVersion_skillId_occurredAt_idx" ON "CourseAttempt"("profileId", "courseId", "curriculumVersion", "skillId", "occurredAt");
CREATE INDEX "CourseAttempt_profileId_courseId_curriculumVersion_lessonId_idx" ON "CourseAttempt"("profileId", "courseId", "curriculumVersion", "lessonId");
