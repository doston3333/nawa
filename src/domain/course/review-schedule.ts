export interface ReviewAttemptSummary {
  /** Counts before the incoming attempt is applied. */
  attemptCount: number;
  correctCount: number;
  correct: boolean;
  hintUsed: boolean;
}

/**
 * A restrained, deterministic retrieval schedule. It prioritizes repair after
 * an error, treats hinted answers as assisted (not mastered) recall, and only
 * expands spacing when accuracy is already reliable.
 */
export function reviewIntervalDays(input: ReviewAttemptSummary): number {
  if (!input.correct) return 0;
  if (input.hintUsed) return 1;

  const nextAttempts = input.attemptCount + 1;
  const nextCorrect = input.correctCount + 1;
  const accuracy = nextCorrect / nextAttempts;
  if (accuracy < 0.8) return 1;
  if (nextCorrect <= 2) return 1;
  if (nextCorrect <= 4) return 3;
  if (nextCorrect <= 7) return 7;
  if (nextCorrect <= 10) return 14;
  return 30;
}
