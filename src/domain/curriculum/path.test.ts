import { BEGINNER_ATOMS } from "./seed";
import { ACTIVE_COURSE, LESSONS, UNITS, checkpointCount, orderedLessons } from "./path";
import { tipsForLesson } from "./tips";

it("references only atoms that exist in the curriculum", () => {
  const ids = new Set(BEGINNER_ATOMS.map((atom) => atom.id));
  for (const lesson of LESSONS) {
    expect(lesson.atomIds.length).toBeGreaterThan(0);
    for (const atomId of lesson.atomIds) {
      expect(ids.has(atomId), `${lesson.id} missing ${atomId}`).toBe(true);
    }
  }
  for (const unit of UNITS) {
    for (const lessonId of unit.lessonIds) {
      expect(LESSONS.some((lesson) => lesson.id === lessonId)).toBe(true);
    }
  }
});

it("meets professional path scale with unit checkpoints and tips", () => {
  expect(UNITS.length).toBeGreaterThanOrEqual(8);
  expect(orderedLessons().length).toBeGreaterThanOrEqual(32);
  expect(checkpointCount()).toBe(8);
  expect(BEGINNER_ATOMS.length).toBeGreaterThanOrEqual(180);

  for (const lesson of LESSONS) {
    const tips = lesson.tips ?? tipsForLesson(lesson.id);
    expect(tips.length, `${lesson.id} needs tips`).toBeGreaterThan(0);
  }
});

it("checkpoint atomIds are a subset of that unit’s non-checkpoint lesson atoms", () => {
  for (const checkpoint of LESSONS.filter((lesson) => lesson.kind === "CHECKPOINT")) {
    const unitAtoms = new Set(
      LESSONS.filter(
        (lesson) => lesson.unitId === checkpoint.unitId && lesson.kind !== "CHECKPOINT",
      ).flatMap((lesson) => lesson.atomIds),
    );
    for (const atomId of checkpoint.atomIds) {
      expect(
        unitAtoms.has(atomId),
        `${checkpoint.id} includes foreign atom ${atomId}`,
      ).toBe(true);
    }
  }
});

it("derives the compatibility learning path from the active versioned course", () => {
  expect(ACTIVE_COURSE.id).toBe("pre-a1-v1");
  expect(ACTIVE_COURSE.units).toHaveLength(8);
  expect(LESSONS[0]?.id).toBe("rtl-baseline-lesson-1");
  expect(orderedLessons()[0]?.id).toBe("rtl-baseline-lesson-1");
  expect(LESSONS.some((lesson) => lesson.id === "script-1")).toBe(false);
  expect(UNITS).toHaveLength(8);
});
