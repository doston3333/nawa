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

  return (
    <main className="path-shell">
      <header className="path-header">
        <p className="study-room-status-kicker">MSA beginner path</p>
        <h1>Your lessons</h1>
        <p className="path-lede">
          Short modular lessons — like a structured path, without the game noise. Finish one, unlock
          the next.
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
                const className = `path-lesson path-lesson--${lesson.status.toLowerCase()}`;
                const inner = (
                  <>
                    <span className="path-lesson-order" aria-hidden="true">
                      {lesson.order}
                    </span>
                    <span className="path-lesson-body">
                      <span className="path-lesson-title">{lesson.title}</span>
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
