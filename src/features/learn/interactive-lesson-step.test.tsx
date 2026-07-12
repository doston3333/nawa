import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LessonStep, StepKind } from "@/domain/course/types";
import { InteractiveLessonStep } from "./interactive-lesson-step";

const kinds: StepKind[] = ["TEACHING", "COMPARISON", "MATCHING", "SORTING", "WORD_TILES", "SENTENCE_ORDERING", "COMPLETION", "TYPING", "CORRECTION", "COMPREHENSION", "COMPOSITION", "HANDWRITING", "SCORED_TEST"];

function step(kind: StepKind): LessonStep {
  const base = { id: kind, prompt: `Prompt for ${kind}`, arabic: "بَيْت", scored: kind === "SCORED_TEST" };
  if (kind === "TEACHING") return { ...base, kind: "TEACHING" };
  if (kind === "HANDWRITING") return { ...base, kind: "HANDWRITING", exercise: { id: "writing", prompt: "Trace", acceptedAnswer: { policy: "EXACT", values: ["بَيْت"] } }, handwritingTemplateId: "alif-stroke" };
  return { ...base, kind, exercise: { id: "exercise", prompt: "Answer", choices: ["بَيْت", "بَاب"], acceptedAnswer: { policy: "EXACT", values: ["بَيْت"] } } };
}

describe("InteractiveLessonStep", () => {
  it.each(kinds)("renders %s", (kind) => {
    render(<InteractiveLessonStep step={step(kind)} onAdvance={vi.fn()} />);
    expect(screen.getByTestId(`lesson-step-${kind}`)).toBeInTheDocument();
  });

  it("shows scored feedback without exposing hints", () => {
    render(<InteractiveLessonStep step={step("SCORED_TEST")} onAdvance={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "بَاب" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByText("Rule: exact response")).toBeInTheDocument();
    expect(screen.queryByText(/Hint/i)).not.toBeInTheDocument();
  });
});
