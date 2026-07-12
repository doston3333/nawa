import { ACTIVE_COURSE, validateCourseCatalog } from "./catalog";

it("publishes an immutable pre-a1-v1 catalog with eight complete units", () => {
  expect(ACTIVE_COURSE.id).toBe("pre-a1-v1");
  expect(ACTIVE_COURSE.units.map((unit) => unit.id)).toEqual([
    "rtl-baseline",
    "letter-families-i",
    "letter-families-ii",
    "connections",
    "short-vowels-sukun",
    "long-vowels-shadda-tanwin",
    "special-orthography",
    "decoding-first-phrases",
  ]);

  for (const unit of ACTIVE_COURSE.units) {
    const lessons = unit.lessons.filter((lesson) => lesson.kind === "LESSON");
    const checkpoint = unit.lessons.filter((lesson) => lesson.kind === "CHECKPOINT");
    expect(lessons).toHaveLength(8);
    expect(checkpoint).toHaveLength(1);
    for (const lesson of unit.lessons) {
      expect(lesson.steps).toHaveLength(10);
      expect(lesson.steps.slice(-3).every((step) => step.scored && !step.hints?.length)).toBe(true);
    }
  }

  expect(() => validateCourseCatalog(ACTIVE_COURSE)).not.toThrow();
  expect(Object.isFrozen(ACTIVE_COURSE)).toBe(true);
});

it("rejects a catalog whose prerequisite points forward", () => {
  const invalid = structuredClone(ACTIVE_COURSE);
  invalid.skills[0]!.prerequisiteSkillIds = [invalid.skills[1]!.id];

  expect(() => validateCourseCatalog(invalid)).toThrow(
    "prerequisite must come first",
  );
});

it("rejects missing or duplicated checkpoint assessment exercises", () => {
  const missing = structuredClone(ACTIVE_COURSE);
  missing.units[0]!.lessons[8]!.assessment!.exerciseIds = ["not-a-step-exercise-1", "not-a-step-exercise-2", "not-a-step-exercise-3"];
  expect(() => validateCourseCatalog(missing)).toThrow("references an unknown exercise");

  const duplicate = structuredClone(ACTIVE_COURSE);
  const exerciseId = duplicate.units[0]!.lessons[8]!.assessment!.exerciseIds[0]!;
  duplicate.units[0]!.lessons[8]!.assessment!.exerciseIds = [exerciseId, exerciseId, exerciseId];
  expect(() => validateCourseCatalog(duplicate)).toThrow("duplicate exercise");
});

it("rejects duplicate or out-of-order unit and lesson orders", () => {
  const duplicateUnit = structuredClone(ACTIVE_COURSE);
  duplicateUnit.units[1]!.order = duplicateUnit.units[0]!.order;
  expect(() => validateCourseCatalog(duplicateUnit)).toThrow("duplicate unit order");

  const unorderedLesson = structuredClone(ACTIVE_COURSE);
  unorderedLesson.units[0]!.lessons[1]!.order = 0;
  expect(() => validateCourseCatalog(unorderedLesson)).toThrow("lesson order must be strictly increasing");
});

it("publishes unique selectable answers for every course exercise", () => {
  for (const lesson of ACTIVE_COURSE.units.flatMap((unit) => unit.lessons)) {
    for (const step of lesson.steps) {
      const choices = step.exercise?.choices ?? [];
      expect(new Set(choices).size, `${step.id} has duplicate choices`).toBe(choices.length);
    }
  }
});
