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

  if (session.loading) return <main aria-busy="true">Preparing your study room…</main>;
  if (session.error && !session.view) {
    return (
      <main>
        <p role="alert">{session.error}</p>
        <button type="button" onClick={session.retry}>Retry</button>
      </main>
    );
  }
  if (!session.view) return <main><p role="alert">Unable to load your study session</p></main>;

  if (!session.currentTask) {
    return (
      <main className="study-room study-room-complete">
        <ProgressSummary counts={session.counts} />
      </main>
    );
  }

  const task = session.currentTask;
  return (
    <main className="study-room">
      <StageRail active={task.stage} />
      <div className="study-canvas">
        <p aria-live="polite">{stageLabels[task.stage]}</p>
        <h1>{stageLabels[task.stage]}</h1>
        <p>{task.estimatedMinutes} min</p>
        {session.error ? <p role="alert">{session.error}</p> : null}
        <TaskCard task={task} onSubmit={session.submitAttempt} submitting={session.submitting} />
      </div>
      <aside className="coach-column" aria-label="Learning coach" hidden>Learning help</aside>
    </main>
  );
}
