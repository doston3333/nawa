import { BEGINNER_ATOMS } from "./seed";
import { LESSONS, UNITS } from "./path";

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
