import type { SessionStage } from "@/domain/learning/types";

const labels: Record<SessionStage, string> = {
  ARRIVAL: "Arrival", RETRIEVAL: "Retrieval", NEW_CONCEPT: "New concept",
  INPUT: "Input", OUTPUT: "Output", CLOSE: "Close",
};

export function StageRail({ active }: { active: SessionStage }) {
  return (
    <nav aria-label="Study stages">
      <ol>
        {Object.entries(labels).map(([stage, label]) => (
          <li key={stage} aria-current={stage === active ? "step" : undefined}>{label}</li>
        ))}
      </ol>
    </nav>
  );
}
