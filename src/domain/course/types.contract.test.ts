import type { LessonStep } from "./types";

// @ts-expect-error Handwriting steps must name a handwriting template.
const missingTemplate: LessonStep = {
  id: "handwriting",
  kind: "HANDWRITING",
  prompt: "Trace the letter.",
  arabic: "ا",
  scored: false,
};

// @ts-expect-error Typed steps must include an answer-bearing exercise.
const missingExercise: LessonStep = {
  id: "typing",
  kind: "TYPING",
  prompt: "Type the answer.",
  arabic: "ا",
  scored: true,
};

it("keeps step payload requirements in the type contract", () => {
  expect(missingTemplate).toBeDefined();
  expect(missingExercise).toBeDefined();
});
