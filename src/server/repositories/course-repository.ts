import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { ACTIVE_COURSE } from "@/domain/course/catalog";
import type { CourseLevel, LessonDefinition, SkillDefinition } from "@/domain/course/types";
import { ACTIVE_LESSONS, ACTIVE_UNITS } from "@/domain/curriculum/path";
import type { LearnPathView, SessionPlan, SessionTask, StudySessionView } from "@/domain/learning/types";
import { db } from "@/server/db";
import { ensureProfile, lockProfileWithinTransaction } from "@/server/repositories/study-repository";

export interface ActiveCoursePathContract {
  courseId: string;
  curriculumVersion: number;
  level: string;
  title: string;
  units: CourseLevel["units"];
}

export interface DueReviewProjection {
  courseId: string;
  curriculumVersion: number;
  skillId: string;
  dueAt: string;
  lastReviewedAt: string | null;
}

function isActiveVersion(courseId: string, curriculumVersion: number): boolean {
  return courseId === ACTIVE_COURSE.id && curriculumVersion === ACTIVE_COURSE.version;
}

function assertActiveVersion(courseId: string, curriculumVersion: number): void {
  if (!isActiveVersion(courseId, curriculumVersion)) throw new Error("Unknown curriculum version");
}

export function getActiveCoursePathContract(): ActiveCoursePathContract {
  return {
    courseId: ACTIVE_COURSE.id,
    curriculumVersion: ACTIVE_COURSE.version,
    level: ACTIVE_COURSE.level,
    title: ACTIVE_COURSE.title,
    units: ACTIVE_COURSE.units,
  };
}

export function validateActiveCourseLesson(courseId: string, curriculumVersion: number, lessonId: string): LessonDefinition {
  assertActiveVersion(courseId, curriculumVersion);
  const lesson = ACTIVE_COURSE.units.flatMap((unit) => unit.lessons).find((item) => item.id === lessonId);
  if (!lesson) throw new Error("Lesson not found");
  return lesson;
}

export function validateActiveCourseSkill(courseId: string, curriculumVersion: number, skillId: string): SkillDefinition {
  assertActiveVersion(courseId, curriculumVersion);
  const skill = ACTIVE_COURSE.skills.find((item) => item.id === skillId);
  if (!skill) throw new Error("Skill not found");
  return skill;
}

/**
 * The active course is authored as individual steps, so its durable session
 * plan must retain that same sequence. Legacy generated plans remain only for
 * historical sessions and the separate Study Room.
 */
function buildVersionedLessonPlan(input: {
  sessionId: string;
  profileId: string;
  lesson: LessonDefinition;
  now: string;
}): SessionPlan {
  const skill = ACTIVE_COURSE.skills.find((item) => item.id === input.lesson.skillIds[0]);
  const atomId = skill?.vocabularyAtomIds[0] ?? "letter-alif";
  const tasks: SessionTask[] = input.lesson.steps.map((step) => {
    const choices = step.exercise?.choices ? [...step.exercise.choices] : null;
    const responseMode = step.kind === "COMPOSITION" || step.kind === "HANDWRITING"
      ? "WRITE"
      : choices?.length ? "SELECT" : "TYPE";
    return {
      id: step.id,
      stage: "LESSON",
      kind: responseMode === "SELECT" ? "SELECT" : responseMode === "TYPE" ? "PRODUCE" : "LESSON",
      atomIds: [atomId],
      prompt: step.exercise?.prompt ?? step.prompt,
      promptArabic: step.arabic ?? null,
      expectedAnswer: step.exercise?.acceptedAnswer.values[0] ?? null,
      estimatedMinutes: 1,
      choices,
      responseMode,
    };
  });
  return {
    id: input.sessionId,
    profileId: input.profileId,
    durationMinutes: 30,
    createdAt: input.now,
    tasks,
    mode: "LESSON",
    lessonId: input.lesson.id,
  };
}

async function ensureEnrollment(
  tx: Prisma.TransactionClient,
  profileId: string,
  courseId: string,
  curriculumVersion: number,
): Promise<void> {
  await tx.courseEnrollment.upsert({
    where: { profileId_courseId_curriculumVersion: { profileId, courseId, curriculumVersion } },
    update: {},
    create: { profileId, courseId, curriculumVersion },
  });
}

async function assertLessonPrerequisites(
  tx: Prisma.TransactionClient,
  profileId: string,
  lesson: LessonDefinition,
): Promise<void> {
  const skillIds = new Set(lesson.skillIds);
  const required = ACTIVE_COURSE.skills
    .filter((skill) => skillIds.has(skill.id))
    .flatMap((skill) => skill.prerequisiteSkillIds);
  if (!required.length) return;
  const rows = await tx.courseSkillProgress.findMany({
    where: { profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: ACTIVE_COURSE.version, skillId: { in: required } },
    select: { skillId: true, status: true },
  });
  const mastered = new Set(rows.filter((row) => row.status === "MASTERED").map((row) => row.skillId));
  if (required.some((skillId) => !mastered.has(skillId))) throw new Error("Lesson is locked by skill prerequisites");
}

/** Starts/resumes a session tied to the current curriculum version. */
export async function startVersionedLessonSession(input: {
  profileId: string;
  courseId: string;
  curriculumVersion: number;
  lessonId: string;
  now: string;
}): Promise<StudySessionView> {
  const courseLesson = validateActiveCourseLesson(input.courseId, input.curriculumVersion, input.lessonId);
  await ensureProfile(input.profileId);
  return db.$transaction(async (tx) => {
    await lockProfileWithinTransaction(tx, input.profileId);
    await ensureEnrollment(tx, input.profileId, input.courseId, input.curriculumVersion);
    await assertLessonPrerequisites(tx, input.profileId, courseLesson);
    const active = await tx.studySession.findFirst({
      where: { profileId: input.profileId, status: "ACTIVE" }, orderBy: { updatedAt: "desc" },
    });
    if (active) {
      const plan = active.plan as unknown as SessionPlan;
      if (active.courseId === input.courseId && active.curriculumVersion === input.curriculumVersion && active.lessonId === input.lessonId) {
        return { plan, currentTaskIndex: active.currentTaskIndex, status: active.status };
      }
      await tx.studySession.update({ where: { id: active.id }, data: { status: "COMPLETE" } });
    }
    const sessionId = randomUUID();
    const plan = buildVersionedLessonPlan({
      sessionId,
      profileId: input.profileId,
      lesson: courseLesson,
      now: input.now,
    });
    await tx.studySession.create({
      data: {
        id: sessionId, profileId: input.profileId, durationMinutes: 30, plan: plan as unknown as Prisma.InputJsonValue,
        startedAt: new Date(input.now), courseId: input.courseId, curriculumVersion: input.curriculumVersion, lessonId: input.lessonId,
      },
    });
    return { plan, currentTaskIndex: 0, status: "ACTIVE" };
  });
}

export async function getDueReviewProjection(profileId: string, now = new Date()): Promise<DueReviewProjection[]> {
  assertActiveVersion(ACTIVE_COURSE.id, ACTIVE_COURSE.version);
  const reviews = await db.courseReview.findMany({
    where: { profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: ACTIVE_COURSE.version, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
  });
  return reviews.map((review) => ({
    courseId: review.courseId, curriculumVersion: review.curriculumVersion, skillId: review.skillId,
    dueAt: review.dueAt.toISOString(), lastReviewedAt: review.lastReviewedAt?.toISOString() ?? null,
  }));
}

/** Active-path projection intentionally reads only versioned skill rows. */
export async function getVersionedLearnPath(profileId: string): Promise<LearnPathView> {
  const rows = await db.courseSkillProgress.findMany({
    where: { profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: ACTIVE_COURSE.version },
  });
  const bySkill = new Map(rows.map((row) => [row.skillId, row]));
  const statusFor = (lesson: (typeof ACTIVE_LESSONS)[number]) => {
    const skills = lesson.id === "" ? [] : ACTIVE_COURSE.units.flatMap((unit) => unit.lessons).find((item) => item.id === lesson.id)?.skillIds ?? [];
    const definitions = skills.map((id) => ACTIVE_COURSE.skills.find((skill) => skill.id === id)!);
    if (definitions.length && definitions.every((skill) => bySkill.get(skill.id)?.status === "MASTERED")) return "COMPLETE" as const;
    const prerequisites = definitions.flatMap((skill) => skill.prerequisiteSkillIds);
    if (prerequisites.some((id) => bySkill.get(id)?.status !== "MASTERED")) return "LOCKED" as const;
    if (skills.some((id) => bySkill.get(id)?.attemptCount)) return "IN_PROGRESS" as const;
    return "AVAILABLE" as const;
  };
  const units = ACTIVE_UNITS.map((unit) => ({
    ...unit,
    lessons: ACTIVE_LESSONS.filter((lesson) => lesson.unitId === unit.id).sort((a, b) => a.order - b.order).map((lesson) => {
      const skillIds = ACTIVE_COURSE.units.flatMap((courseUnit) => courseUnit.lessons).find((item) => item.id === lesson.id)?.skillIds ?? [];
      const attemptCount = skillIds.reduce((total, id) => total + (bySkill.get(id)?.attemptCount ?? 0), 0);
      const correctCount = skillIds.reduce((total, id) => total + (bySkill.get(id)?.correctCount ?? 0), 0);
      return { ...lesson, status: statusFor(lesson), scoreCorrect: correctCount, scoreTotal: attemptCount };
    }),
  }));
  const next = units.flatMap((unit) => unit.lessons).find((lesson) => lesson.status === "AVAILABLE" || lesson.status === "IN_PROGRESS");
  return { units, nextLessonId: next?.id ?? null };
}

export async function recordCourseAttemptWithinTransaction(input: {
  id: string;
  profileId: string;
  courseId: string;
  curriculumVersion: number;
  lessonId: string;
  skillId: string;
  exerciseType: string;
  correct: boolean;
  responseTimeMs: number;
  hintUsed: boolean;
  errorClassification?: string | null;
  handwritingMetrics?: unknown;
  occurredAt: string;
}, tx: Prisma.TransactionClient): Promise<unknown> {
  const lesson = validateActiveCourseLesson(input.courseId, input.curriculumVersion, input.lessonId);
  const skill = validateActiveCourseSkill(input.courseId, input.curriculumVersion, input.skillId);
  if (!lesson.skillIds.includes(skill.id)) throw new Error("skillId is not part of the lesson");
  if (!Number.isInteger(input.responseTimeMs) || input.responseTimeMs < 0) throw new Error("responseTimeMs must be a non-negative integer");
  await ensureEnrollment(tx, input.profileId, input.courseId, input.curriculumVersion);
  // Sync mutations bypass session start, so enforce the same prerequisite
  // boundary while the attempt, progress, and mutation ledger share a txn.
  await assertLessonPrerequisites(tx, input.profileId, lesson);
  const existingAttempt = await tx.courseAttempt.findUnique({ where: { id: input.id } });
  if (existingAttempt) return existingAttempt;
  await tx.courseAttempt.create({
    data: {
      ...input,
      errorClassification: input.errorClassification ?? null,
      handwritingMetrics: input.handwritingMetrics as Prisma.InputJsonValue | undefined,
      occurredAt: new Date(input.occurredAt),
    },
  });
  const progressKey = { profileId_courseId_curriculumVersion_skillId: {
    profileId: input.profileId, courseId: input.courseId, curriculumVersion: input.curriculumVersion, skillId: input.skillId,
  } };
  const current = await tx.courseSkillProgress.findUnique({ where: progressKey });
  const attemptCount = (current?.attemptCount ?? 0) + 1;
  const correctCount = (current?.correctCount ?? 0) + Number(input.correct);
  const mastered = correctCount >= skill.reviewRule.requireCorrect && (correctCount / attemptCount) * 100 >= skill.masteryThreshold;
  const status = mastered ? "MASTERED" : "IN_PROGRESS";
  await tx.courseSkillProgress.upsert({
    where: progressKey,
    update: { attemptCount, correctCount, status, masteredAt: mastered ? new Date(input.occurredAt) : null },
    create: { profileId: input.profileId, courseId: input.courseId, curriculumVersion: input.curriculumVersion, skillId: input.skillId, attemptCount, correctCount, status, masteredAt: mastered ? new Date(input.occurredAt) : null },
  });
  if (input.correct) {
    const dueAt = new Date(new Date(input.occurredAt).getTime() + skill.reviewRule.afterDays * 86_400_000);
    await tx.courseReview.upsert({
      where: progressKey,
      update: { dueAt, lastReviewedAt: new Date(input.occurredAt) },
      create: { profileId: input.profileId, courseId: input.courseId, curriculumVersion: input.curriculumVersion, skillId: input.skillId, dueAt, lastReviewedAt: new Date(input.occurredAt) },
    });
  }
  return tx.courseAttempt.findUnique({ where: { id: input.id } });
}
