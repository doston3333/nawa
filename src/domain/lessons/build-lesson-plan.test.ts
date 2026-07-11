import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { getLessonById } from "@/domain/curriculum/path";
import { buildLessonPlan } from "./build-lesson-plan";

it("builds a short scored lesson with mix of select and type tasks", () => {
  const lesson = getLessonById("script-1");
  expect(lesson).toBeTruthy();
  const plan = buildLessonPlan({
    sessionId: "00000000-0000-4000-8000-000000000300",
    learnerId: "00000000-0000-4000-8000-000000000001",
    lesson: lesson!,
    atoms: BEGINNER_ATOMS,
    now: "2026-07-12T00:00:00.000Z",
  });
  expect(plan.mode).toBe("LESSON");
  expect(plan.lessonId).toBe("script-1");
  expect(plan.tasks.length).toBeGreaterThanOrEqual(6);
  expect(plan.tasks.some((task) => task.kind === "SELECT")).toBe(true);
  expect(plan.tasks.some((task) => task.responseMode === "TYPE")).toBe(true);
  for (const task of plan.tasks) {
    expect(task.expectedAnswer).toBeTruthy();
    expect(task.atomIds.length).toBeGreaterThan(0);
  }
});
