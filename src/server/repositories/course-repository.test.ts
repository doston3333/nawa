import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { ACTIVE_COURSE } from "@/domain/course/catalog";
import { db } from "@/server/db";
import {
  getActiveCoursePathContract,
  getVersionedLearnPath,
  startVersionedLessonSession,
  validateActiveCourseLesson,
  validateActiveCourseSkill,
} from "./course-repository";

const profileId = randomUUID();
const otherProfileId = randomUUID();

beforeAll(async () => {
  await db.profile.createMany({ data: [{ id: profileId, name: "Course learner" }, { id: otherProfileId, name: "Other learner" }] });
});

afterAll(async () => {
  await db.profile.deleteMany({ where: { id: { in: [profileId, otherProfileId] } } });
  await db.$disconnect();
});

it("exposes the active Pre-A1 course path and validates its versioned lesson and skill IDs", () => {
  const firstLesson = ACTIVE_COURSE.units[0]!.lessons[0]!;
  const firstSkill = ACTIVE_COURSE.skills[0]!;

  expect(getActiveCoursePathContract()).toMatchObject({
    courseId: "pre-a1-v1",
    curriculumVersion: 1,
    level: "PRE_A1",
    units: expect.arrayContaining([expect.objectContaining({ id: "rtl-baseline" })]),
  });
  expect(validateActiveCourseLesson("pre-a1-v1", 1, firstLesson.id)).toBe(firstLesson);
  expect(validateActiveCourseSkill("pre-a1-v1", 1, firstSkill.id)).toBe(firstSkill);
  expect(() => validateActiveCourseLesson("pre-a1-v2", 2, firstLesson.id)).toThrow("Unknown curriculum version");
  expect(() => validateActiveCourseLesson("pre-a1-v1", 1, "missing-lesson")).toThrow("Lesson not found");
  expect(() => validateActiveCourseSkill("pre-a1-v1", 1, "missing-skill")).toThrow("Skill not found");
});

it("keeps legacy lesson records isolated from versioned-course completion and enforces skill prerequisites", async () => {
  const first = ACTIVE_COURSE.units[0]!.lessons[0]!;
  const second = ACTIVE_COURSE.units[0]!.lessons[1]!;
  await db.lessonProgress.create({ data: { profileId, lessonId: "script-1", status: "COMPLETE", scoreCorrect: 8, scoreTotal: 8 } });
  await expect(startVersionedLessonSession({ profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: 1, lessonId: second.id, now: "2026-07-12T00:00:00.000Z" }))
    .rejects.toThrow("prerequisites");
  await db.courseSkillProgress.create({
    data: { profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: 1, skillId: first.skillIds[0]!, attemptCount: 3, correctCount: 3, status: "MASTERED" },
  });
  const started = await startVersionedLessonSession({ profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: 1, lessonId: second.id, now: "2026-07-12T00:00:00.000Z" });
  const resumed = await startVersionedLessonSession({ profileId, courseId: ACTIVE_COURSE.id, curriculumVersion: 1, lessonId: second.id, now: "2026-07-12T00:01:00.000Z" });
  expect(resumed.plan.id).toBe(started.plan.id);
  expect(await db.courseEnrollment.count({ where: { profileId: otherProfileId } })).toBe(0);
  expect(await db.lessonProgress.findUnique({ where: { profileId_lessonId: { profileId, lessonId: "script-1" } } })).toMatchObject({ status: "COMPLETE" });
});

it("projects only versioned skill progress into the public active path", async () => {
  const first = ACTIVE_COURSE.units[0]!.lessons[0]!;
  await db.lessonProgress.create({ data: { profileId: otherProfileId, lessonId: first.id, status: "COMPLETE", scoreCorrect: 9, scoreTotal: 9 } });
  const before = await getVersionedLearnPath(otherProfileId);
  expect(before.units[0]!.lessons[0]!.status).toBe("AVAILABLE");
  await db.courseSkillProgress.create({ data: { profileId: otherProfileId, courseId: ACTIVE_COURSE.id, curriculumVersion: 1, skillId: first.skillIds[0]!, attemptCount: 3, correctCount: 3, status: "MASTERED" } });
  const after = await getVersionedLearnPath(otherProfileId);
  expect(after.units[0]!.lessons[0]!.status).toBe("COMPLETE");
});
