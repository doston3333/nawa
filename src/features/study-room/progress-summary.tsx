import type { Ability } from "@/domain/learning/types";

export function ProgressSummary({ counts, corrections = [] }: {
  counts: Record<Ability, number>;
  corrections?: string[];
}) {
  return (
    <section aria-labelledby="progress-title">
      <h1 id="progress-title">Session complete</h1>
      <p>
        You can read {counts.READING} items, understand {counts.LISTENING} in listening, write {counts.WRITING}, and speak {counts.SPEAKING}.
      </p>
      {corrections.length > 0 ? (
        <div>
          <h2>Keep working on</h2>
          <ul>{corrections.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
