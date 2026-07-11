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
  return (
    <aside aria-label="Learning coach">
      <p aria-live="polite">{HELP_STEPS[level]}</p>
      <button type="button" disabled={blocked} onClick={() => onAdvance(Math.min(7, level + 1) as HelpLevel)}>
        Next hint
      </button>
    </aside>
  );
}
