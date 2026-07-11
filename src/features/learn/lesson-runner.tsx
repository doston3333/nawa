"use client";

import Link from "next/link";
import { TaskCard } from "@/features/study-room/task-card";
import { ProgressSummary } from "@/features/study-room/progress-summary";
import { useLessonSession } from "./use-lesson-session";

export function LessonRunner({ lessonId, title }: { lessonId: string; title?: string }) {
  const session = useLessonSession(lessonId);

  if (session.loading) {
    return (
      <main className="lesson-shell" aria-busy="true">
        <p className="study-room-status-kicker">Lesson</p>
        <h1>Preparing exercises…</h1>
      </main>
    );
  }

  if (session.error && !session.view) {
    return (
      <main className="lesson-shell">
        <p role="alert">{session.error}</p>
        <div className="complete-actions">
          <button type="button" className="primary-action" onClick={session.retry}>
            Retry
          </button>
          <Link className="secondary-action" href="/learn">
            Back to path
          </Link>
        </div>
      </main>
    );
  }

  if (!session.view) {
    return (
      <main className="lesson-shell">
        <p role="alert">Unable to load lesson</p>
      </main>
    );
  }

  if (!session.currentTask) {
    return (
      <main className="lesson-shell lesson-complete">
        <p className="study-room-status-kicker">Lesson complete</p>
        <h1>{title ?? "Lesson complete"}</h1>
        <ProgressSummary counts={session.counts} />
        <div className="complete-actions">
          {session.nextLessonId ? (
            <Link className="primary-action" href={`/learn/${session.nextLessonId}`}>
              Continue path
            </Link>
          ) : (
            <Link className="primary-action" href="/learn">
              Back to path
            </Link>
          )}
          <Link className="secondary-action" href="/learn">
            Path map
          </Link>
          <Link className="secondary-action" href="/study">
            Long study session
          </Link>
        </div>
      </main>
    );
  }

  const total = session.view.plan.tasks.length;
  const index = session.view.currentTaskIndex;
  const pct = Math.round(((index + 1) / total) * 100);

  return (
    <main className="lesson-shell">
      <header className="lesson-header">
        <div className="lesson-header-row">
          <p className="study-room-status-kicker">Lesson</p>
          <Link className="text-action" href="/learn">
            Path
          </Link>
        </div>
        <h1 className="lesson-title">{title ?? "Lesson"}</h1>
        <p className="lesson-progress-label">
          Exercise {index + 1} of {total}
        </p>
        <div className="lesson-progress-track" aria-hidden="true">
          <div className="lesson-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {session.error ? (
        <p className="study-error" role="alert">
          {session.error}
        </p>
      ) : null}

      <TaskCard
        key={session.currentTask.id}
        task={session.currentTask}
        onSubmit={session.submitAttempt}
        submitting={session.submitting}
        compact
      />
    </main>
  );
}
