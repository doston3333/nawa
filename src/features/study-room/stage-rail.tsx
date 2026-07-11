import type { SessionStage } from "@/domain/learning/types";

const labels: Record<SessionStage, string> = {
  ARRIVAL: "Arrival",
  RETRIEVAL: "Retrieval",
  NEW_CONCEPT: "New concept",
  INPUT: "Input",
  OUTPUT: "Output",
  CLOSE: "Close",
};

const stageOrder = Object.keys(labels) as SessionStage[];

export function StageRail({
  active,
  remainingMinutes,
  durationMinutes,
  taskIndex,
  taskCount,
}: {
  active: SessionStage;
  remainingMinutes: number;
  durationMinutes: number;
  taskIndex: number;
  taskCount: number;
}) {
  const activeIndex = stageOrder.indexOf(active);

  return (
    <nav className="stage-rail" aria-label="Study stages">
      <div className="stage-rail-brand">
        <span className="stage-rail-mark" aria-hidden="true">ن</span>
        <div>
          <p className="stage-rail-title">Nawa</p>
          <p className="stage-rail-subtitle">Study room</p>
        </div>
      </div>

      <div className="stage-rail-time" aria-label={`${remainingMinutes} minutes remaining of ${durationMinutes}`}>
        <span className="stage-rail-time-value">{remainingMinutes}</span>
        <span className="stage-rail-time-unit">min left</span>
        <div className="stage-rail-time-track" aria-hidden="true">
          <div
            className="stage-rail-time-fill"
            style={{ width: `${Math.max(4, (remainingMinutes / durationMinutes) * 100)}%` }}
          />
        </div>
      </div>

      <ol className="stage-rail-list">
        {stageOrder.map((stage, index) => {
          const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming";
          return (
            <li
              key={stage}
              className={`stage-rail-item stage-rail-item--${state}`}
              aria-current={stage === active ? "step" : undefined}
            >
              <span className="stage-rail-index" aria-hidden="true">
                {state === "done" ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <span className="stage-rail-label">{labels[stage]}</span>
            </li>
          );
        })}
      </ol>

      <p className="stage-rail-progress">
        Task {taskIndex + 1} of {taskCount}
      </p>
    </nav>
  );
}
