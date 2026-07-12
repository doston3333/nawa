import { Prisma } from "@/generated/prisma/client";
import type {
  LearnPathView,
  LessonProgressRecord,
  StudySessionView,
} from "@/domain/learning/types";
import { nextActiveLessonId } from "@/domain/curriculum/path";
import { isLessonComplete } from "@/domain/lessons/unlock";
import { db } from "@/server/db";
import { ensureProfile, lockProfileWithinTransaction } from "@/server/repositories/study-repository";
import { getActiveCoursePathContract, getVersionedLearnPath, startVersionedLessonSession } from "@/server/repositories/course-repository";
import { ACTIVE_COURSE } from "@/domain/course/catalog";

export async function listLessonProgress(profileId: string): Promise<LessonProgressRecord[]> {
  const rows = await db.lessonProgress.findMany({ where: { profileId } });
  return rows.map((row) => ({
    lessonId: row.lessonId,
    status: row.status,
    scoreCorrect: row.scoreCorrect,
    scoreTotal: row.scoreTotal,
    completedAt: row.completedAt?.toISOString() ?? null,
  }));
}

export async function getLearnPath(profileId: string): Promise<LearnPathView & { course: ReturnType<typeof getActiveCoursePathContract> }> {
  await ensureProfile(profileId);
  return { ...await getVersionedLearnPath(profileId), course: getActiveCoursePathContract() };
}

export async function startLessonSession(input: {
  profileId: string;
  lessonId: string;
  now: string;
}): Promise<StudySessionView> {
  return startVersionedLessonSession({
    ...input,
    courseId: ACTIVE_COURSE.id,
    curriculumVersion: ACTIVE_COURSE.version,
  });
}

export async function recordLessonAttemptScore(input: {
  profileId: string;
  lessonId: string;
  correct: boolean | null;
}): Promise<void> {
  if (input.correct === null) return;
  await db.$transaction((tx) => recordLessonAttemptScoreWithinTransaction(input, tx));
}

export async function recordLessonAttemptScoreWithinTransaction(
  input: { profileId: string; lessonId: string; correct: boolean | null },
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (input.correct === null) return;
  await lockProfileWithinTransaction(tx, input.profileId);
  const existing = await tx.lessonProgress.findUnique({
    where: {
      profileId_lessonId: { profileId: input.profileId, lessonId: input.lessonId },
    },
  });
  const scoreCorrect = (existing?.scoreCorrect ?? 0) + (input.correct ? 1 : 0);
  const scoreTotal = (existing?.scoreTotal ?? 0) + 1;
  await tx.lessonProgress.upsert({
    where: {
      profileId_lessonId: { profileId: input.profileId, lessonId: input.lessonId },
    },
    update: {
      status: "IN_PROGRESS",
      scoreCorrect,
      scoreTotal,
    },
    create: {
      profileId: input.profileId,
      lessonId: input.lessonId,
      status: "IN_PROGRESS",
      scoreCorrect,
      scoreTotal,
    },
  });
}

export async function completeLessonAfterSessionWithinTransaction(
  input: { profileId: string; lessonId: string },
  tx: Prisma.TransactionClient,
): Promise<{ completed: boolean; nextLessonId: string | null; passed: boolean }> {
  await lockProfileWithinTransaction(tx, input.profileId);
  const row = await tx.lessonProgress.findUnique({
    where: { profileId_lessonId: { profileId: input.profileId, lessonId: input.lessonId } },
  });
  const passed = row ? isLessonComplete(row.scoreCorrect, Math.max(row.scoreTotal, 1)) : false;
  await tx.lessonProgress.upsert({
    where: { profileId_lessonId: { profileId: input.profileId, lessonId: input.lessonId } },
    update: { status: "COMPLETE", completedAt: new Date() },
    create: {
      profileId: input.profileId,
      lessonId: input.lessonId,
      status: "COMPLETE",
      scoreCorrect: row?.scoreCorrect ?? 0,
      scoreTotal: row?.scoreTotal ?? 0,
      completedAt: new Date(),
    },
  });
  return { completed: true, nextLessonId: nextActiveLessonId(input.lessonId), passed };
}

export async function maybeCompleteLesson(input: {
  profileId: string;
  lessonId: string;
}): Promise<{ completed: boolean; nextLessonId: string | null }> {
  const row = await db.lessonProgress.findUnique({
    where: {
      profileId_lessonId: { profileId: input.profileId, lessonId: input.lessonId },
    },
  });
  if (!row) return { completed: false, nextLessonId: null };

  if (row.status === "COMPLETE") {
    return { completed: true, nextLessonId: nextActiveLessonId(input.lessonId) };
  }

  if (!isLessonComplete(row.scoreCorrect, row.scoreTotal)) {
    // Still mark complete if they finished all tasks with any attempts? Plan says 60%
    // If they finished but below threshold, keep IN_PROGRESS for retry — UI can restart
    return { completed: false, nextLessonId: null };
  }

  await db.lessonProgress.update({
    where: {
      profileId_lessonId: { profileId: input.profileId, lessonId: input.lessonId },
    },
    data: {
      status: "COMPLETE",
      completedAt: new Date(),
    },
  });
  return { completed: true, nextLessonId: nextActiveLessonId(input.lessonId) };
}

/** Force-complete when learner finished all exercises even if score is low — still unlocks path for demo UX. */
export async function completeLessonAfterSession(input: {
  profileId: string;
  lessonId: string;
}): Promise<{ completed: boolean; nextLessonId: string | null; passed: boolean }> {
  return db.$transaction((tx) => completeLessonAfterSessionWithinTransaction(input, tx));
}
