import { describe, expect, it } from "vitest";
import { evaluateLessonAnswer } from "./lesson-evaluator";

describe("evaluateLessonAnswer", () => {
  it("evaluates every accepted-answer policy deterministically", () => {
    expect(evaluateLessonAnswer({ policy: "EXACT", values: ["ب"] }, "ب").correct).toBe(true);
    expect(evaluateLessonAnswer({ policy: "ANY_OF", values: ["ب", "باء"] }, "باء").correct).toBe(true);
    expect(evaluateLessonAnswer({ policy: "NORMALIZED_ARABIC", values: ["بَيْت"] }, "بيت").correct).toBe(true);
    expect(evaluateLessonAnswer({ policy: "ORDERED_TOKENS", values: ["أنا أقرأ"] }, "أنا أقرأ").correct).toBe(true);
    expect(evaluateLessonAnswer({ policy: "ORDERED_TOKENS", values: ["أنا أقرأ"] }, "أقرأ أنا").correct).toBe(false);
  });

  it("returns a precise non-revealing reason for a wrong answer", () => {
    const result = evaluateLessonAnswer({ policy: "EXACT", values: ["ب"] }, "ت");
    expect(result).toEqual({ correct: false, errorClassification: "EXACT_MISMATCH", reason: "This form does not match the required answer." });
  });
});
