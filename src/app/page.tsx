import Link from "next/link";

export default function HomePage() {
  return (
    <main className="today-shell">
      <p className="eyebrow">NAWA · PROFESSIONAL MSA PATH</p>
      <h1>Your Arabic, built daily</h1>
      <p className="lede">
        A serious Modern Standard Arabic course path for adults: modular lessons, unit mini-tests,
        clear explanations, ability-aware mastery, and an optional deep Study Room — built for
        script and production, not cartoon streaks.
      </p>

      <ul className="home-points" aria-label="What Nawa includes">
        <li>8 units · 36 path nodes including checkpoints</li>
        <li>Short lessons + scored mini-tests after each unit</li>
        <li>MSA tips before practice · full abjad · ~200+ forms</li>
        <li>Inspect Arabic forms · diacritics · ability-separated progress</li>
        <li>Optional 30–60 minute Study Room for deep retrieval</li>
      </ul>

      <aside className="demo-limits" aria-label="How this is different">
        <p className="demo-limits-title">Better for Arabic, on purpose</p>
        <ul>
          <li>Script-first path and morphology tips Duo Arabic often skims.</li>
          <li>Checkpoints re-test the unit with production, not only recognition.</li>
          <li>No hearts, streaks, XP, or leagues — serious study only.</li>
        </ul>
      </aside>

      <div className="home-actions">
        <Link className="primary-action" href="/learn">
          Continue path
        </Link>
        <Link className="secondary-action" href="/study">
          Long study session
        </Link>
        <Link className="text-action" href="/profiles">
          Switch profile
        </Link>
        <p className="home-note">
          Primary flow is the modular path. Use Study Room when you want a full hour shape.
        </p>
      </div>
    </main>
  );
}
