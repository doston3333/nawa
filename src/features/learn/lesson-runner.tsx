"use client";

import Link from "next/link";
import { useState } from "react";
import { getLessonById } from "@/domain/curriculum/path";
import { TaskCard } from "@/features/study-room/task-card";
import { ProgressSummary } from "@/features/study-room/progress-summary";
import { LessonTips } from "./lesson-tips";
import { useLessonSession } from "./use-lesson-session";
import { SyncStatus } from "@/features/offline/sync-status";
import { ACTIVE_PROFILE_NAME_STORAGE_KEY } from "@/features/offline/attempt-mutation";

export function LessonRunner({ lessonId, title }: { lessonId: string; title?: string }) {
  const session = useLessonSession(lessonId);
  const [profileName] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(ACTIVE_PROFILE_NAME_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const lesson = getLessonById(lessonId);
  const tips = lesson?.tips ?? [];
  const isCheckpoint = lesson?.kind === "CHECKPOINT";

  if (session.loading) {
    return (
      <main className="lesson-shell" aria-busy="true">
        <p className="study-room-status-kicker">{isCheckpoint ? "Checkpoint" : "Lesson"}</p>
        <h1>Preparing exercises…</h1>
      </main>
    );
  }

  if (session.error && !session.view) {
    return (
      <main className="lesson-shell">
        <SyncStatus internetRequired={session.internetRequired} />
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
        <p className="study-room-status-kicker">
          {isCheckpoint ? "Checkpoint complete" : "Lesson complete"}
        </p>
        <h1>{title ?? "Complete"}</h1>
        <p className="path-lede">
          {isCheckpoint
            ? "You re-tested this unit’s forms. Production and recognition both count toward mastery."
            : "Short modular practice done. Ability evidence is saved for retrieval later."}
        </p>
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
          <p className="study-room-status-kicker">
            {isCheckpoint ? "Unit checkpoint" : "Lesson"}
          </p>
          {profileName ? <p className="study-room-status-kicker">Profile: {profileName}</p> : null}
          <Link className="text-action" href="/learn">
            Path
          </Link>
        </div>
        <h1 className="lesson-title">{title ?? "Lesson"}</h1>
        <p className="lesson-progress-label">
          Exercise {index + 1} of {total}
          {isCheckpoint ? " · scored mini-test" : ""}
        </p>
        <SyncStatus profileId={session.view.plan.profileId} />
        <div className="lesson-progress-track" aria-hidden="true">
          <div className="lesson-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <LessonTips tips={tips} lessonTitle={title} />

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
