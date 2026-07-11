import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { INPUT_PASSAGES } from "@/domain/curriculum/passages";
import { buildSessionPlan } from "./build-session-plan";
import type { MasterySnapshot } from "@/domain/learning/types";

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

it("varies cold-start content with a real retrieval target", () => {
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

it("advances past pure letter-first once many letters are solid", () => {
  const letterMastery: MasterySnapshot[] = BEGINNER_ATOMS.filter((a) => a.kind === "LETTER")
    .slice(0, 12)
    .map((atom) => ({
      learnerId: "learner-1",
      atomId: atom.id,
      ability: "READING" as const,
      state: "RETRIEVED" as const,
      successfulRetrievals: 1,
      lastAttemptAt: "2026-07-01T00:00:00.000Z",
      lastSuccessfulRetrievalAt: "2026-07-01T00:00:00.000Z",
      nextReviewAt: "2026-07-20T00:00:00.000Z",
    }));

  const plan = buildSessionPlan({
    learnerId: "learner-1",
    durationMinutes: 30,
    now: "2026-07-11T10:00:00.000Z",
    atoms: BEGINNER_ATOMS,
    mastery: letterMastery,
  });
  const concept = plan.tasks.find((task) => task.stage === "NEW_CONCEPT");
  const unlocked = BEGINNER_ATOMS.find((a) => a.id === concept?.atomIds[0]);
  expect(unlocked?.kind).not.toBe("LETTER");
});

it("draws input from a large passage bank", () => {
  expect(INPUT_PASSAGES.length).toBeGreaterThanOrEqual(25);
  const plan = buildSessionPlan({
    learnerId: "learner-1",
    durationMinutes: 45,
    now: "2026-07-11T10:00:00.000Z",
    atoms: BEGINNER_ATOMS,
    mastery: [],
  });
  const input = plan.tasks.find((task) => task.stage === "INPUT");
  expect(input?.promptArabic).toBeTruthy();
  expect(INPUT_PASSAGES.some((p) => p.arabic === input?.promptArabic)).toBe(true);
});
