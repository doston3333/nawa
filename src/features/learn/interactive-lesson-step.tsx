"use client";

import { useState } from "react";
import type { LessonStep } from "@/domain/course/types";
import { evaluateLessonAnswer, type LessonAnswerEvaluation } from "./lesson-evaluator";
import { HandwritingPractice, type HandwritingResult } from "./handwriting-practice";

export interface InteractiveStepSubmission {
  answer: string;
  correct: boolean;
  errorClassification: string | null;
  hintUsed: boolean;
  exerciseType: LessonStep["kind"];
  responseMode: "SELECT" | "TYPE" | "WRITE";
  startedAt: string;
  handwritingMetrics?: Record<string, unknown>;
}

const labels: Record<LessonStep["kind"], string> = {
  TEACHING: "Learn", COMPARISON: "Compare", MATCHING: "Match", SORTING: "Sort",
  WORD_TILES: "Build words", SENTENCE_ORDERING: "Order sentence", COMPLETION: "Complete",
  TYPING: "Type", CORRECTION: "Correct", COMPREHENSION: "Understand", COMPOSITION: "Compose",
  HANDWRITING: "Handwriting practice", SCORED_TEST: "Scored check",
};

function isArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

export function InteractiveLessonStep({ step, onAdvance, submitting = false }: {
  step: LessonStep;
  onAdvance: (submission?: InteractiveStepSubmission) => void | Promise<void>;
  submitting?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<LessonAnswerEvaluation | null>(null);
  const [handwriting, setHandwriting] = useState<HandwritingResult | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const isTeaching = step.kind === "TEACHING";
  const isHandwriting = step.kind === "HANDWRITING";
  const choices = !isTeaching && !isHandwriting ? step.exercise.choices ?? [] : [];
  const selectMode = choices.length > 0 && !["COMPOSITION", "TYPING", "COMPLETION", "CORRECTION"].includes(step.kind);
  const scored = step.scored || step.kind === "SCORED_TEST";

  const check = () => {
    if (isTeaching) {
      void onAdvance();
      return;
    }
    setEvaluation(evaluateLessonAnswer(step.exercise.acceptedAnswer, answer));
  };
  const advance = () => {
    if ((!evaluation && !isHandwriting) || isTeaching || (isHandwriting && !handwriting)) return;
    if (isHandwriting && handwriting) {
      void onAdvance({
        answer: step.exercise.acceptedAnswer.values[0] ?? "", correct: handwriting.metrics.passed,
        errorClassification: handwriting.metrics.passed ? null : "HANDWRITING_SHAPE", hintUsed: false,
        exerciseType: step.kind, responseMode: "WRITE", startedAt, handwritingMetrics: { ...handwriting.metrics, strokes: handwriting.strokes },
      });
      return;
    }
    if (!evaluation) return;
    void onAdvance({
      answer, correct: evaluation.correct, errorClassification: evaluation.errorClassification,
      hintUsed: false, exerciseType: step.kind, responseMode: selectMode ? "SELECT" : step.kind === "COMPOSITION" ? "WRITE" : "TYPE", startedAt,
    });
  };

  return (
    <section className="interactive-step" data-testid={`lesson-step-${step.kind}`} aria-labelledby={`${step.id}-title`}>
      <p className="interactive-step-kicker">{labels[step.kind]}{scored ? " · scored" : ""}</p>
      <h2 id={`${step.id}-title`}>{step.prompt}</h2>
      {step.arabic ? <p className="interactive-step-arabic" lang="ar" dir="rtl">{step.arabic}</p> : null}
      {isTeaching ? <p className="interactive-step-rule">Rule: notice the model, then continue when you are ready.</p> : null}
      {isHandwriting ? <HandwritingPractice glyph={step.arabic ?? "ا"} onComplete={setHandwriting} /> : null}
      {!isTeaching && !isHandwriting ? (
        <>
          <p className="interactive-step-instruction">{step.exercise.prompt}</p>
          {selectMode ? <div className="interactive-step-choices" role="group" aria-label="Answer choices">
            {choices.map((choice) => <button key={choice} type="button" className={answer === choice ? "is-selected" : ""} onClick={() => { setAnswer(choice); setEvaluation(null); }}>
              <span lang={isArabic(choice) ? "ar" : undefined} dir={isArabic(choice) ? "rtl" : "auto"}>{choice}</span>
            </button>)}
          </div> : <label className="answer-field">
            <span className="answer-field-label">Your answer</span>
            <textarea value={answer} onChange={(event) => { setAnswer(event.target.value); setEvaluation(null); }} dir="auto" rows={step.kind === "COMPOSITION" ? 5 : 3} autoComplete="off" spellCheck={false} />
          </label>}
          {!scored && step.hints?.length ? <p className="interactive-step-hint">Hint: {step.hints[0]}</p> : null}
        </>
      ) : null}
      {evaluation ? <div className={`interactive-step-feedback ${evaluation.correct ? "is-correct" : "is-incorrect"}`} role="status">
        <strong>{evaluation.correct ? "Correct" : "Incorrect"}</strong>
        {evaluation.reason ? <p>{evaluation.reason}</p> : null}
        <p>Rule: {step.exercise!.acceptedAnswer.policy === "EXACT" ? "exact response" : step.exercise!.acceptedAnswer.policy.replaceAll("_", " ").toLocaleLowerCase()}</p>
        <p>Contrast: compare your response with the prompt’s Arabic model, right to left.</p>
      </div> : null}
      <div className="task-actions">
        {!evaluation && !isHandwriting ? <button type="button" className="primary-action" onClick={check} disabled={submitting || (!isTeaching && !answer.trim())}>{isTeaching ? "Continue" : "Check answer"}</button> : isHandwriting ? <button type="button" className="primary-action" onClick={advance} disabled={submitting || !handwriting}>Continue</button> : <button type="button" className="primary-action" onClick={advance} disabled={submitting}>Continue</button>}
      </div>
    </section>
  );
}
