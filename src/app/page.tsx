import Link from "next/link";

export default function HomePage() {
  return (
    <main className="today-shell">
      <p className="eyebrow">NAWA · MODULAR MSA PATH</p>
      <h1>Your Arabic, built daily</h1>
      <p className="lede">
        Nawa is a serious Modern Standard Arabic path for adult beginners — short modular lessons
        like a structured course, plus an optional deep Study Room. Not a game, not a chat bot.
      </p>

      <ul className="home-points" aria-label="What this demo includes">
        <li>Unit → lesson path (script, greetings, home, study…)</li>
        <li>Short exercises: match, read, type — finish in minutes</li>
        <li>Full abjad + ~200 high-utility MSA forms</li>
        <li>Optional long Study Room for focused 30–60 minute work</li>
      </ul>

      <aside className="demo-limits" aria-label="Demo limits">
        <p className="demo-limits-title">Demo honesty</p>
        <ul>
          <li>Anonymous cookie identity — clearing cookies starts a new notebook.</li>
          <li>No hearts, streaks, or XP — progress is lesson unlock only.</li>
          <li>Rate limits protect the shared demo.</li>
        </ul>
      </aside>

      <div className="home-actions">
        <Link className="primary-action" href="/learn">
          Continue path
        </Link>
        <Link className="secondary-action" href="/study">
          Long study session
        </Link>
        <p className="home-note">
          Primary flow is modular lessons. Use the Study Room when you want a full hour shape.
        </p>
      </div>
    </main>
  );
}
