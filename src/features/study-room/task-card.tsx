"use client";

import { useState } from "react";
import type { HelpLevel, SessionTask } from "@/domain/learning/types";
import { CoachPanel } from "./coach-panel";
import { DiacriticText } from "./diacritic-text";

export interface TaskSubmission {
  answer: string;
  helpLevel: HelpLevel;
  attempted: boolean;
  startedAt: string;
  confidence: 1 | 2 | 3 | 4 | 5;
}

export function TaskCard({
  task,
  onSubmit,
  submitting = false,
}: {
  task: SessionTask;
  onSubmit: (submission: TaskSubmission) => void | Promise<void>;
  submitting?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [helpLevel, setHelpLevel] = useState<HelpLevel>(0);
  const [attempted, setAttempted] = useState(false);
  const [awaitingRetry, setAwaitingRetry] = useState(false);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [startedAt] = useState(() => new Date().toISOString());

  const handleSubmit = () => {
    const submission: TaskSubmission = {
      answer,
      helpLevel,
      attempted: true,
      startedAt,
      confidence,
    };

    if (helpLevel === 7 && !awaitingRetry && task.expectedAnswer) {
      setAttempted(true);
      setAwaitingRetry(true);
      return;
    }

    setAttempted(true);
    void onSubmit(submission);
  };

  return (
    <section className="task-card">
      <p>{task.prompt}</p>
      {task.promptArabic ? (
        <DiacriticText
          vocalized={task.promptArabic}
          ambiguous={task.promptArabic}
          plain={task.promptArabic}
          level={helpLevel >= 2 ? "FULL" : "NONE"}
        />
      ) : null}
      <label>
        My answer
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} dir="auto" />
      </label>
      {awaitingRetry && task.expectedAnswer ? (
        <p className="expected-answer" lang="ar" dir="rtl">
          Expected: {task.expectedAnswer}
        </p>
      ) : null}
      <fieldset className="confidence-fieldset">
        <legend>How sure were you?</legend>
        {([1, 2, 3, 4, 5] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="confidence"
              value={value}
              checked={confidence === value}
              onChange={() => setConfidence(value)}
            />
            {value}
          </label>
        ))}
      </fieldset>
      <CoachPanel level={helpLevel} attempted={attempted} onAdvance={setHelpLevel} />
      <button className="primary-action" type="button" onClick={handleSubmit} disabled={submitting}>
        {awaitingRetry ? "Try corrected answer" : "Continue"}
      </button>
    </section>
  );
}
