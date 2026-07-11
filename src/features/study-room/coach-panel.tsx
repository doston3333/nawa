"use client";

import type { HelpLevel } from "@/domain/learning/types";

export const HELP_STEPS = [
  "Try without help",
  "Replay audio",
  "Show diacritics",
  "Highlight the relevant segment",
  "Reveal root or pattern",
  "Show an Arabic hint",
  "Show a constrained English hint",
  "Reveal the answer and retry",
] as const;

export function CoachPanel({ level, attempted, onAdvance }: {
  level: HelpLevel;
  attempted: boolean;
  onAdvance: (level: HelpLevel) => void;
}) {
  const blocked = level >= 7 || (level === 6 && !attempted);
  const passed = HELP_STEPS.slice(0, level);

  return (
    <aside className="coach-panel" aria-label="Learning coach">
      <header className="coach-panel-header">
        <p className="coach-panel-kicker">Coach</p>
        <h2 className="coach-panel-title">Help ladder</h2>
        <p className="coach-panel-lede">
          Attempt first. Each step reveals one more cue — never the full answer by default.
        </p>
      </header>

      <p className="coach-panel-current" aria-live="polite">
        <span className="coach-panel-current-label">Now</span>
        <span className="coach-panel-current-value">{HELP_STEPS[level]}</span>
      </p>

      <ol className="help-ladder">
        {passed.map((step) => (
          <li key={step} className="help-ladder-step help-ladder-step--passed">
            <span className="help-ladder-dot" aria-hidden="true" />
            <span className="help-ladder-text">{step}</span>
          </li>
        ))}
        <li className="help-ladder-step help-ladder-step--current">
          <span className="help-ladder-dot" aria-hidden="true" />
          <span className="help-ladder-text help-ladder-text--current-marker">Current step</span>
        </li>
        {level < 7 ? (
          <li className="help-ladder-step help-ladder-step--locked">
            <span className="help-ladder-dot" aria-hidden="true" />
            <span className="help-ladder-text">{7 - level} more if needed</span>
          </li>
        ) : null}
      </ol>

      <button
        className="coach-panel-advance"
        type="button"
        disabled={blocked}
        onClick={() => onAdvance(Math.min(7, level + 1) as HelpLevel)}
      >
        Next hint
      </button>

      {level === 6 && !attempted ? (
        <p className="coach-panel-note">Submit an attempt before the full answer is available.</p>
      ) : null}
    </aside>
  );
}
