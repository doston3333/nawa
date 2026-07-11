import Link from "next/link";

export default function HomePage() {
  return (
    <main className="today-shell">
      <p className="eyebrow">NAWA · PUBLIC STUDY ROOM DEMO</p>
      <h1>Your Arabic, built daily</h1>
      <p className="lede">
        Nawa is a serious Modern Standard Arabic Study Room for adult beginners — not a game,
        not a chat bot. Open a focused session: retrieve, learn, read, produce, and close with
        ability-specific progress.
      </p>

      <ul className="home-points" aria-label="What this demo includes">
        <li>30–60 minute Study Room with six stable stages</li>
        <li>MSA-only beginner spine: full alphabet + ~200 high-utility forms & phrases</li>
        <li>Separate reading, listening, writing, and speaking signals</li>
        <li>Isolated browser session — your progress is not shared with other visitors</li>
      </ul>

      <aside className="demo-limits" aria-label="Demo limits">
        <p className="demo-limits-title">Demo honesty</p>
        <ul>
          <li>Anonymous cookie identity — clearing cookies starts a new notebook.</li>
          <li>No accounts, offline sync, speech scoring, or full A1 curriculum yet.</li>
          <li>Rate limits protect the shared demo (slow down if you hit 429).</li>
          <li>Use “Reset notebook” in the Study Room to start clean.</li>
        </ul>
      </aside>

      <div className="home-actions">
        <Link className="primary-action" href="/study">
          Begin today’s study
        </Link>
        <p className="home-note">
          Public foundation slice. Notebook, Reader, Language Ink full notes, and accounts are later
          roadmap — this demo teases Ink inside the session only.
        </p>
      </div>
    </main>
  );
}
