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
