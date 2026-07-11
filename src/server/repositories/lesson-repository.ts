import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type {
  LearnPathView,
  LessonProgressRecord,
  SessionPlan,
  StudySessionView,
} from "@/domain/learning/types";
import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { getLessonById, nextLessonId } from "@/domain/curriculum/path";
import { buildLessonPlan } from "@/domain/lessons/build-lesson-plan";
import { buildLearnPathView, isLessonComplete } from "@/domain/lessons/unlock";
import { db } from "@/server/db";
import { ensureLearner } from "@/server/repositories/study-repository";

export async function listLessonProgress(learnerId: string): Promise<LessonProgressRecord[]> {
  const rows = await db.lessonProgress.findMany({ where: { learnerId } });
  return rows.map((row) => ({
    lessonId: row.lessonId,
    status: row.status,
    scoreCorrect: row.scoreCorrect,
    scoreTotal: row.scoreTotal,
    completedAt: row.completedAt?.toISOString() ?? null,
  }));
}

export async function getLearnPath(learnerId: string): Promise<LearnPathView> {
  await ensureLearner(learnerId);
  const progress = await listLessonProgress(learnerId);
  return buildLearnPathView(progress);
}

export async function startLessonSession(input: {
  learnerId: string;
  lessonId: string;
  now: string;
}): Promise<StudySessionView> {
  await ensureLearner(input.learnerId);
  const lesson = getLessonById(input.lessonId);
  if (!lesson) throw new Error("Lesson not found");

  const path = await getLearnPath(input.learnerId);
  const node = path.units.flatMap((unit) => unit.lessons).find((item) => item.id === input.lessonId);
  if (!node || node.status === "LOCKED") {
    throw new Error("Lesson is locked");
  }

  const active = await db.studySession.findFirst({
    where: { learnerId: input.learnerId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
  if (active) {
    const plan = active.plan as unknown as SessionPlan;
    if (plan.mode === "LESSON" && plan.lessonId === input.lessonId) {
      return {
        plan,
        currentTaskIndex: active.currentTaskIndex,
        status: active.status,
      };
    }
    // Complete other active session so path lessons stay focused
    await db.studySession.update({
      where: { id: active.id },
      data: { status: "COMPLETE" },
    });
  }

  const sessionId = randomUUID();
  const plan = buildLessonPlan({
    sessionId,
    learnerId: input.learnerId,
    lesson,
    atoms: BEGINNER_ATOMS,
    now: input.now,
  });

  await db.studySession.create({
    data: {
      id: sessionId,
      learnerId: input.learnerId,
      durationMinutes: 30,
      plan: plan as unknown as Prisma.InputJsonValue,
      startedAt: new Date(input.now),
    },
  });

  await db.lessonProgress.upsert({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
    update: { status: "IN_PROGRESS" },
    create: {
      learnerId: input.learnerId,
      lessonId: input.lessonId,
      status: "IN_PROGRESS",
    },
  });

  return { plan, currentTaskIndex: 0, status: "ACTIVE" };
}

export async function recordLessonAttemptScore(input: {
  learnerId: string;
  lessonId: string;
  correct: boolean | null;
}): Promise<void> {
  if (input.correct === null) return;
  const existing = await db.lessonProgress.findUnique({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
  });
  const scoreCorrect = (existing?.scoreCorrect ?? 0) + (input.correct ? 1 : 0);
  const scoreTotal = (existing?.scoreTotal ?? 0) + 1;
  await db.lessonProgress.upsert({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
    update: {
      status: "IN_PROGRESS",
      scoreCorrect,
      scoreTotal,
    },
    create: {
      learnerId: input.learnerId,
      lessonId: input.lessonId,
      status: "IN_PROGRESS",
      scoreCorrect,
      scoreTotal,
    },
  });
}

export async function maybeCompleteLesson(input: {
  learnerId: string;
  lessonId: string;
}): Promise<{ completed: boolean; nextLessonId: string | null }> {
  const row = await db.lessonProgress.findUnique({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
  });
  if (!row) return { completed: false, nextLessonId: null };

  if (row.status === "COMPLETE") {
    return { completed: true, nextLessonId: nextLessonId(input.lessonId) };
  }

  if (!isLessonComplete(row.scoreCorrect, row.scoreTotal)) {
    // Still mark complete if they finished all tasks with any attempts? Plan says 60%
    // If they finished but below threshold, keep IN_PROGRESS for retry — UI can restart
    return { completed: false, nextLessonId: null };
  }

  await db.lessonProgress.update({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
    data: {
      status: "COMPLETE",
      completedAt: new Date(),
    },
  });
  return { completed: true, nextLessonId: nextLessonId(input.lessonId) };
}

/** Force-complete when learner finished all exercises even if score is low — still unlocks path for demo UX. */
export async function completeLessonAfterSession(input: {
  learnerId: string;
  lessonId: string;
}): Promise<{ completed: boolean; nextLessonId: string | null; passed: boolean }> {
  const row = await db.lessonProgress.findUnique({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
  });
  const passed = row ? isLessonComplete(row.scoreCorrect, Math.max(row.scoreTotal, 1)) : false;

  await db.lessonProgress.upsert({
    where: {
      learnerId_lessonId: { learnerId: input.learnerId, lessonId: input.lessonId },
    },
    update: {
      status: "COMPLETE",
      completedAt: new Date(),
    },
    create: {
      learnerId: input.learnerId,
      lessonId: input.lessonId,
      status: "COMPLETE",
      scoreCorrect: row?.scoreCorrect ?? 0,
      scoreTotal: row?.scoreTotal ?? 0,
      completedAt: new Date(),
    },
  });

  return {
    completed: true,
    nextLessonId: nextLessonId(input.lessonId),
    passed,
  };
}
