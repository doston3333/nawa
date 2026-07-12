import type { AcceptedAnswer } from "@/domain/course/types";

export interface LessonAnswerEvaluation {
  correct: boolean;
  errorClassification: string | null;
  reason: string | null;
}

function normalizeArabic(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim();
}

export function evaluateLessonAnswer(accepted: AcceptedAnswer, answer: string): LessonAnswerEvaluation {
  const trimmed = answer.trim();
  const correct = accepted.policy === "EXACT"
    ? accepted.values.includes(trimmed)
    : accepted.policy === "NORMALIZED_ARABIC"
      ? accepted.values.some((value) => normalizeArabic(value) === normalizeArabic(trimmed))
      : accepted.policy === "ORDERED_TOKENS"
        ? accepted.values.some((value) => value.trim().split(/\s+/).join(" ") === trimmed.split(/\s+/).join(" "))
        : accepted.values.some((value) => value.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase());
  if (correct) return { correct: true, errorClassification: null, reason: null };
  const messages = {
    EXACT: ["EXACT_MISMATCH", "This form does not match the required answer."],
    NORMALIZED_ARABIC: ["ARABIC_FORM_MISMATCH", "Check the Arabic letters and their order."],
    ORDERED_TOKENS: ["TOKEN_ORDER_MISMATCH", "The words need to be in the required order."],
    ANY_OF: ["UNACCEPTED_ALTERNATIVE", "That is not one of the accepted answers."],
  } as const;
  const [errorClassification, reason] = messages[accepted.policy];
  return { correct: false, errorClassification, reason };
}
