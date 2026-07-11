"use client";

import { StageRail } from "./stage-rail";
import { TaskCard } from "./task-card";
import { ProgressSummary } from "./progress-summary";
import { useStudySession } from "./use-study-session";

const stageLabels = {
  ARRIVAL: "Arrival",
  RETRIEVAL: "Retrieval",
  NEW_CONCEPT: "New concept",
  INPUT: "Input",
  OUTPUT: "Output",
  CLOSE: "Close",
} as const;

export function StudyRoom({ durationMinutes }: { durationMinutes: 30 | 45 | 60 }) {
  const session = useStudySession(durationMinutes);

  if (session.loading) {
    return (
      <main className="study-room-status" aria-busy="true">
        <p className="study-room-status-kicker">Nawa</p>
        <h1>Preparing your study room…</h1>
        <p className="study-room-status-lede">Building today’s retrieval and output sequence.</p>
      </main>
    );
  }

  if (session.error && !session.view) {
    return (
      <main className="study-room-status">
        <p role="alert">{session.error}</p>
        <button className="primary-action" type="button" onClick={session.retry}>
          Retry
        </button>
      </main>
    );
  }

  if (!session.view) {
    return (
      <main className="study-room-status">
        <p role="alert">Unable to load your study session</p>
      </main>
    );
  }

  if (!session.currentTask) {
    return (
      <main className="study-room study-room-complete">
        <ProgressSummary counts={session.counts} />
      </main>
    );
  }

  const task = session.currentTask;
  const remainingMinutes = session.view.plan.tasks
    .slice(session.view.currentTaskIndex)
    .reduce((sum, item) => sum + item.estimatedMinutes, 0);

  return (
    <main className="study-room">
      <StageRail
        active={task.stage}
        remainingMinutes={remainingMinutes}
        durationMinutes={session.view.plan.durationMinutes}
        taskIndex={session.view.currentTaskIndex}
        taskCount={session.view.plan.tasks.length}
      />

      <div className="study-canvas">
        <header className="study-canvas-header">
          <p className="study-canvas-kicker" aria-live="polite">
            {stageLabels[task.stage]}
          </p>
          <div className="study-canvas-heading-row">
            <h1 className="study-canvas-title">{stageLabels[task.stage]}</h1>
            <p className="study-canvas-minutes">
              <span className="study-canvas-minutes-value">{task.estimatedMinutes} min</span>
            </p>
          </div>
        </header>

        {session.error ? (
          <p className="study-error" role="alert">
            {session.error}
          </p>
        ) : null}

        <TaskCard
          key={task.id}
          task={task}
          onSubmit={session.submitAttempt}
          submitting={session.submitting}
        />
      </div>
    </main>
  );
}
