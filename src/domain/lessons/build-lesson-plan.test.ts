import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { getLessonById, LESSONS } from "@/domain/curriculum/path";
import { buildLessonPlan, productionTaskRatio } from "./build-lesson-plan";

/** Union of atom ids from non-checkpoint lessons in the same unit as the checkpoint. */
function unitLessonAtomIds(checkpoint: { unitId: string; id: string }): Set<string> {
  return new Set(
    LESSONS.filter(
      (lesson) =>
        lesson.unitId === checkpoint.unitId &&
        lesson.kind !== "CHECKPOINT" &&
        lesson.id !== checkpoint.id,
    ).flatMap((lesson) => lesson.atomIds),
  );
}

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

it("builds a checkpoint mini-test from unit atoms with heavy production", () => {
  const lesson = getLessonById("script-check");
  expect(lesson?.kind).toBe("CHECKPOINT");
  expect(lesson!.atomIds.length).toBeGreaterThanOrEqual(10);

  const plan = buildLessonPlan({
    sessionId: "00000000-0000-4000-8000-000000000301",
    learnerId: "00000000-0000-4000-8000-000000000001",
    lesson: lesson!,
    atoms: BEGINNER_ATOMS,
    now: "2026-07-12T00:00:00.000Z",
  });

  expect(plan.tasks.length).toBeGreaterThanOrEqual(8);
  expect(productionTaskRatio(plan.tasks)).toBeGreaterThanOrEqual(0.45);

  const unitAtomSet = new Set(lesson!.atomIds);
  for (const task of plan.tasks) {
    expect(unitAtomSet.has(task.atomIds[0]!)).toBe(true);
    expect(task.expectedAnswer).toBeTruthy();
  }
});

it("every checkpoint atom set is drawn only from that unit’s lesson atoms", () => {
  const checkpoints = LESSONS.filter((lesson) => lesson.kind === "CHECKPOINT");
  expect(checkpoints.length).toBe(8);

  for (const checkpoint of checkpoints) {
    const unitAtoms = unitLessonAtomIds(checkpoint);
    expect(unitAtoms.size, `${checkpoint.id} unit has no lesson atoms`).toBeGreaterThan(0);

    for (const atomId of checkpoint.atomIds) {
      expect(
        unitAtoms.has(atomId),
        `${checkpoint.id} includes ${atomId} not taught in unit ${checkpoint.unitId} lessons`,
      ).toBe(true);
    }

    const plan = buildLessonPlan({
      sessionId: `00000000-0000-4000-8000-0000000003${checkpoint.order.toString().padStart(2, "0")}`,
      learnerId: "00000000-0000-4000-8000-000000000001",
      lesson: checkpoint,
      atoms: BEGINNER_ATOMS,
      now: "2026-07-12T00:00:00.000Z",
    });
    expect(plan.tasks.length, checkpoint.id).toBeGreaterThanOrEqual(6);
    expect(productionTaskRatio(plan.tasks), checkpoint.id).toBeGreaterThanOrEqual(0.45);
    for (const task of plan.tasks) {
      expect(unitAtoms.has(task.atomIds[0]!), `${checkpoint.id} task atom outside unit`).toBe(true);
      expect(task.expectedAnswer).toBeTruthy();
    }
  }
});
