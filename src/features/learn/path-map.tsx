"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LearnPathView, LessonNodeStatus } from "@/domain/learning/types";

function statusLabel(status: LessonNodeStatus): string {
  if (status === "COMPLETE") return "Complete";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "AVAILABLE") return "Ready";
  return "Locked";
}

export function PathMap() {
  const [path, setPath] = useState<LearnPathView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/learn/path", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load path");
        setPath(body as LearnPathView);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to load path");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <main className="path-shell" aria-busy="true">
        <p className="study-room-status-kicker">Nawa path</p>
        <h1>Loading your path…</h1>
      </main>
    );
  }

  if (error || !path) {
    return (
      <main className="path-shell">
        <p role="alert">{error ?? "Unable to load path"}</p>
        <Link className="primary-action" href="/">
          Home
        </Link>
      </main>
    );
  }

  const totalLessons = path.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const completeLessons = path.units.reduce(
    (sum, unit) => sum + unit.lessons.filter((l) => l.status === "COMPLETE").length,
    0,
  );

  return (
    <main className="path-shell">
      <header className="path-header">
        <p className="study-room-status-kicker">MSA beginner path</p>
        <h1>Your lessons</h1>
        <p className="path-lede">
          Eight units of short modular lessons, each ending in a <strong>checkpoint mini-test</strong>.
          Explanations before you practice. Ability-aware mastery underneath — no hearts or streaks.
        </p>
        <p className="path-scale" aria-label="Path progress">
          {completeLessons} of {totalLessons} lessons complete · {path.units.length} units
        </p>
        <div className="complete-actions">
          {path.nextLessonId ? (
            <Link className="primary-action" href={`/learn/${path.nextLessonId}`}>
              Continue learning
            </Link>
          ) : null}
          <Link className="secondary-action" href="/study">
            Long study session
          </Link>
        </div>
      </header>

      <ol className="path-units">
        {path.units.map((unit) => (
          <li key={unit.id} className="path-unit">
            <div className="path-unit-header">
              <h2>{unit.title}</h2>
              <p>{unit.subtitle}</p>
            </div>
            <ol className="path-lessons">
              {unit.lessons.map((lesson) => {
                const locked = lesson.status === "LOCKED";
                const isCheck = lesson.kind === "CHECKPOINT" || lesson.id.endsWith("-check");
                const className = `path-lesson path-lesson--${lesson.status.toLowerCase()}${isCheck ? " path-lesson--checkpoint" : ""}`;
                const inner = (
                  <>
                    <span className="path-lesson-order" aria-hidden="true">
                      {isCheck ? "✓" : lesson.order}
                    </span>
                    <span className="path-lesson-body">
                      <span className="path-lesson-title">
                        {lesson.title}
                        {isCheck ? <span className="path-lesson-badge">Mini-test</span> : null}
                      </span>
                      <span className="path-lesson-status">{statusLabel(lesson.status)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={lesson.id} className={className}>
                    {locked ? (
                      <div className="path-lesson-card path-lesson-card--locked" aria-disabled="true">
                        {inner}
                      </div>
                    ) : (
                      <Link className="path-lesson-card" href={`/learn/${lesson.id}`}>
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </main>
  );
}
