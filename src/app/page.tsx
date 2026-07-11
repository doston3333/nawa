import Link from "next/link";

export default function HomePage() {
  return (
    <main className="today-shell">
      <p className="eyebrow">NAWA · MODERN STANDARD ARABIC</p>
      <h1>Your Arabic, built daily</h1>
      <p className="lede">Retrieve, learn, read, produce, and reflect in one focused session.</p>
      <Link className="primary-action" href="/study">Begin today’s study</Link>
    </main>
  );
}
