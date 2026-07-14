import { describe, expect, it } from "vitest";
import { reviewIntervalDays } from "./review-schedule";

describe("reviewIntervalDays", () => {
  it("sends an incorrect retrieval straight to repair", () => {
    expect(reviewIntervalDays({ attemptCount: 5, correctCount: 4, correct: false, hintUsed: false })).toBe(0);
  });

  it("keeps hinted success close even for a strong skill", () => {
    expect(reviewIntervalDays({ attemptCount: 8, correctCount: 8, correct: true, hintUsed: true })).toBe(1);
  });

  it("widens intervals only after accurate unassisted retrieval", () => {
    expect(reviewIntervalDays({ attemptCount: 0, correctCount: 0, correct: true, hintUsed: false })).toBe(1);
    expect(reviewIntervalDays({ attemptCount: 4, correctCount: 4, correct: true, hintUsed: false })).toBe(7);
    expect(reviewIntervalDays({ attemptCount: 10, correctCount: 10, correct: true, hintUsed: false })).toBe(30);
  });

  it("does not promote a weak skill after a lucky correct answer", () => {
    expect(reviewIntervalDays({ attemptCount: 5, correctCount: 2, correct: true, hintUsed: false })).toBe(1);
  });
});
