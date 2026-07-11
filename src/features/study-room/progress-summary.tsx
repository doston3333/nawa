import type { Ability } from "@/domain/learning/types";

export function ProgressSummary({ counts, corrections = [] }: {
  counts: Record<Ability, number>;
  corrections?: string[];
}) {
  return (
    <section className="progress-summary" aria-labelledby="progress-title">
      <p className="progress-summary-kicker">Session complete</p>
      <h1 id="progress-title">Session complete</h1>
      <p className="progress-summary-lede">
        You can read {counts.READING} items, understand {counts.LISTENING} in listening, write {counts.WRITING}, and speak {counts.SPEAKING}.
      </p>
      <ul className="progress-ability-grid">
        <li>
          <span className="progress-ability-value">{counts.READING}</span>
          <span className="progress-ability-label">Reading</span>
        </li>
        <li>
          <span className="progress-ability-value">{counts.LISTENING}</span>
          <span className="progress-ability-label">Listening</span>
        </li>
        <li>
          <span className="progress-ability-value">{counts.WRITING}</span>
          <span className="progress-ability-label">Writing</span>
        </li>
        <li>
          <span className="progress-ability-value">{counts.SPEAKING}</span>
          <span className="progress-ability-label">Speaking</span>
        </li>
      </ul>
      {corrections.length > 0 ? (
        <div className="progress-corrections">
          <h2>Keep working on</h2>
          <ul>{corrections.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
