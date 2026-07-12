"use client";

import { useState } from "react";

export function LessonTips({ tips, lessonTitle }: { tips: string[]; lessonTitle?: string }) {
  const [open, setOpen] = useState(true);
  if (tips.length === 0) return null;

  return (
    <section className="lesson-tips" aria-label="Lesson explanation">
      <button
        type="button"
        className="lesson-tips-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{open ? "Hide" : "Show"} explanation</span>
        <span className="lesson-tips-kicker">{lessonTitle ? `${lessonTitle} · MSA tips` : "MSA tips"}</span>
      </button>
      {open ? (
        <ol className="lesson-tips-list">
          {tips.map((tip) => (
            <li key={tip.slice(0, 48)}>{tip}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
