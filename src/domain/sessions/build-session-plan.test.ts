import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { buildSessionPlan } from "./build-session-plan";

describe.each([30, 45, 60] as const)("%i-minute plan", (durationMinutes) => {
  it("preserves all six stages and the exact duration", () => {
    const plan = buildSessionPlan({
      learnerId: "learner-1",
      durationMinutes,
      now: "2026-07-11T10:00:00.000Z",
      atoms: BEGINNER_ATOMS,
      mastery: [],
    });
    expect(new Set(plan.tasks.map((task) => task.stage))).toEqual(
      new Set(["ARRIVAL", "RETRIEVAL", "NEW_CONCEPT", "INPUT", "OUTPUT", "CLOSE"]),
    );
    expect(plan.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBe(durationMinutes);
  });
});

it("varies cold-start content beyond a blank retrieval card", () => {
  const plan = buildSessionPlan({
    learnerId: "learner-1",
    durationMinutes: 30,
    now: "2026-07-11T10:00:00.000Z",
    atoms: BEGINNER_ATOMS,
    mastery: [],
  });
  const retrieval = plan.tasks.find((task) => task.stage === "RETRIEVAL");
  const concept = plan.tasks.find((task) => task.stage === "NEW_CONCEPT");
  expect(retrieval?.expectedAnswer).toBeTruthy();
  expect(retrieval?.atomIds.length).toBeGreaterThan(0);
  expect(concept?.promptArabic).toBeTruthy();
  expect(concept?.inkAtomId).toBeTruthy();
});
