"use client";

import { useState } from "react";
import type { HelpLevel, SessionTask } from "@/domain/learning/types";
import { CoachPanel } from "./coach-panel";
import { DiacriticText } from "./diacritic-text";
import { LanguageInk } from "./language-ink";

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

  const diacriticLevel = helpLevel >= 2 ? "FULL" : "NONE";
  const inkId = task.inkAtomId ?? task.atomIds[0] ?? null;

  return (
    <div className="task-card">
      <section className="task-main">
        <p className="task-prompt">{task.prompt}</p>

        {task.promptArabic ? (
          <div className="task-arabic-stage">
            <DiacriticText
              vocalized={task.promptArabic}
              ambiguous={task.promptArabic}
              plain={task.promptArabic}
              level={diacriticLevel}
            />
            {inkId ? <LanguageInk atomId={inkId} label="Inspect this form" /> : null}
          </div>
        ) : (
          <div className="task-arabic-stage task-arabic-stage--empty">
            <p className="arabic-prompt arabic-prompt--muted">···</p>
            {inkId ? <LanguageInk atomId={inkId} label="Inspect related form" /> : null}
          </div>
        )}

        <div className="answer-field">
          <label className="answer-field-label" htmlFor="task-answer">
            My answer
          </label>
          <textarea
            id="task-answer"
            className="answer-field-input"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            dir="auto"
            placeholder="Type in Arabic when you can…"
            rows={4}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {awaitingRetry && task.expectedAnswer ? (
          <p className="expected-answer" lang="ar" dir="rtl">
            <span className="expected-answer-label">Model form</span>
            {task.expectedAnswer}
          </p>
        ) : null}

        <fieldset className="confidence-fieldset">
          <legend>How sure were you?</legend>
          <div className="confidence-options" role="presentation">
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <label key={value} className={`confidence-option${confidence === value ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="confidence"
                  value={value}
                  checked={confidence === value}
                  onChange={() => setConfidence(value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
          <p className="confidence-hint">1 unsure · 5 certain</p>
        </fieldset>

        <div className="task-actions">
          <button
            className="primary-action task-continue"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {awaitingRetry ? "Try corrected answer" : "Continue"}
          </button>
        </div>
      </section>

      <CoachPanel level={helpLevel} attempted={attempted} onAdvance={setHelpLevel} />
    </div>
  );
}
