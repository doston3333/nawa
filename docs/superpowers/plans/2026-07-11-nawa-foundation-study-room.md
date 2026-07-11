# Nawa Foundation and Adaptive Study Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable responsive Nawa vertical slice that plans a serious learner's study session, records immutable evidence, updates ability-specific mastery, and completes the Study Room flow on desktop and mobile.

**Architecture:** A Next.js App Router application hosts the responsive UI and route handlers. Pure TypeScript domain modules own curriculum, mastery, retrieval, and session planning; PostgreSQL repositories persist immutable evidence and resumable sessions. The first slice uses a development-only seeded learner so the learning contracts can be proven before account and synchronization work begins.

**Tech Stack:** Node.js 24 LTS, pnpm 10, Next.js 16.2, React 19.2, TypeScript 5.9, Tailwind CSS 4, PostgreSQL 17, Prisma ORM 7 with `@prisma/adapter-pg`, Zod 4, Vitest, Testing Library, Playwright.

## Global Constraints

- Initial curriculum scope is Modern Standard Arabic from absolute beginner through a strong A1 foundation.
- V1 is a responsive web application and installable PWA; this plan supplies the responsive shell and manifest while Plan 2 supplies offline service-worker synchronization.
- The target learner is a serious adult beginner studying 30–60 minutes per day.
- Original learner content is never overwritten by generated or adapted content.
- Only immutable evidence events may change mastery state.
- Reading, listening, writing, and speaking mastery remain separate; no aggregate fluency percentage is allowed.
- A complete answer is revealed only after an attempt and the ordered help ladder.
- MSA and dialect content are explicitly labeled and never silently mixed.
- Low-confidence speech or handwriting analysis cannot reduce mastery.
- All Arabic text must preserve correct bidirectional behavior and connected forms.
- Every primary interaction must work at 375px width and with keyboard-only navigation.
- No hearts, streaks, leaderboards, virtual currency, mascots, or child-oriented celebration patterns.
- Commit only after the task's focused tests, full unit suite, typecheck, and lint pass.

---

## File map

```text
src/
  app/
    api/study/sessions/route.ts               Start or resume a demo session
    api/study/sessions/[sessionId]/attempts/route.ts
                                                Record an attempt and return updated state
    study/page.tsx                              Study Room route
    globals.css                                 Design tokens and global bidi rules
    layout.tsx                                  Metadata and application shell
    manifest.ts                                 PWA metadata
    page.tsx                                    Today entry screen
  domain/
    curriculum/seed.ts                         Small validated beginner curriculum
    learning/types.ts                          Shared domain contracts
    mastery/apply-evidence.ts                  Pure mastery reducer
    scheduling/retrieval.ts                    Retrieval candidate scoring
    sessions/build-session-plan.ts             Deterministic stage and task planning
  features/study-room/
    coach-panel.tsx                             Ordered help ladder
    diacritic-text.tsx                          Progressive Arabic support
    stage-rail.tsx                              Session stages and time
    study-room.tsx                              Focused session orchestrator
    task-card.tsx                               Task renderer and answer form
    use-study-session.ts                        Client state and API calls
  generated/prisma/                            Generated Prisma client, ignored by reviews
  server/
    db.ts                                       Prisma adapter singleton
    demo-learner.ts                             Development-only learner boundary
    repositories/study-repository.ts            Session and evidence persistence
prisma/
  schema.prisma                                 Persistence schema
  seed.ts                                       Demo learner and curriculum persistence
tests/
  e2e/study-room.spec.ts                        Full desktop and mobile journey
  integration/study-repository.test.ts          PostgreSQL repository behavior
```

---

### Task 1: Scaffold the responsive PWA-ready application and test harness

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/page.test.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/manifest.ts`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `.gitignore`

**Interfaces:**
- Consumes: None.
- Produces: Next.js application, `@/*` path alias, Vitest `jsdom` environment, Playwright web server, and PWA manifest at `/manifest.webmanifest`.

- [ ] **Step 1: Create the package and tool configuration**

Create `package.json` with these scripts and version lines:

```json
{
  "name": "nawa",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.15.0",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.7.0",
    "@prisma/client": "^7.7.0",
    "lucide-react": "^0.468.0",
    "next": "16.2.10",
    "pg": "^8.16.0",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^24.0.0",
    "@types/pg": "^8.15.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "dotenv": "^16.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "16.2.10",
    "jsdom": "^26.0.0",
    "prisma": "^7.7.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.0",
    "vitest": "^4.0.0"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "."
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = { poweredByHeader: false, reactStrictMode: true };
export default nextConfig;
```

Create `postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

Create `playwright.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI },
});
```

Create `.gitignore`:

```gitignore
.next/
node_modules/
.env
playwright-report/
test-results/
coverage/
src/generated/prisma/
```

Run: `pnpm install`
Expected: exit 0 and a new `pnpm-lock.yaml`.

- [ ] **Step 2: Write the failing Today screen test**

Create `src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("Today page", () => {
  it("offers one primary action into the Study Room", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Your Arabic, built daily" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Begin today’s study" })).toHaveAttribute(
      "href",
      "/study",
    );
  });
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"] },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Run the test and verify the page is missing**

Run: `pnpm test src/app/page.test.tsx`
Expected: FAIL because `src/app/page.tsx` does not exist.

- [ ] **Step 4: Implement the minimal shell and Today page**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nawa — Learn Arabic. Live it.",
  description: "A serious Modern Standard Arabic learning notebook.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
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
```

Create `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --paper: #fbf8f0;
  --surface: #fffdf7;
  --ink: #15372a;
  --ink-soft: #496158;
  --sage: #dce5d8;
  --saffron: #c48a19;
  --border: #dcd7ca;
  --focus: #1d6a4b;
}

* { box-sizing: border-box; }
html { background: var(--paper); color: var(--ink); }
body { margin: 0; min-height: 100vh; font-family: Inter, system-ui, sans-serif; }
button, a, input, textarea { font: inherit; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
[dir="rtl"] { font-family: "Noto Naskh Arabic", "Geeza Pro", serif; }
.today-shell { max-width: 52rem; margin: 0 auto; padding: clamp(4rem, 12vw, 9rem) 1.5rem; }
.eyebrow { letter-spacing: .14em; font-size: .75rem; color: var(--ink-soft); }
h1 { font-family: Georgia, serif; font-size: clamp(3rem, 8vw, 6rem); line-height: .98; margin: 1rem 0; }
.lede { max-width: 36rem; color: var(--ink-soft); font-size: 1.125rem; line-height: 1.7; }
.primary-action { display: inline-flex; min-height: 44px; align-items: center; margin-top: 2rem; padding: .75rem 1rem; border-radius: .75rem; background: var(--ink); color: white; text-decoration: none; }
```

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nawa Arabic Study Room",
    short_name: "Nawa",
    description: "Serious Modern Standard Arabic study on desktop and mobile.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f0",
    theme_color: "#15372a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

Generate both icons as simple project-owned PNGs containing the Nawa `ن` mark; do not use third-party logos.

- [ ] **Step 5: Verify the scaffold**

Run: `pnpm test src/app/page.test.tsx && pnpm typecheck && pnpm lint && pnpm build`
Expected: all commands exit 0; the test reports 1 passed; Next.js emits the `/` route and manifest.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts vitest.setup.ts playwright.config.ts .gitignore src/app public/icons
git commit -m "feat: scaffold Nawa PWA shell"
```

---

### Task 2: Define learning contracts and seed a validated beginner curriculum

**Files:**
- Create: `src/domain/learning/types.ts`
- Create: `src/domain/curriculum/seed.ts`
- Create: `src/domain/curriculum/seed.test.ts`

**Interfaces:**
- Consumes: None.
- Produces: `Ability`, `MasteryState`, `KnowledgeAtom`, `EvidenceEvent`, `MasterySnapshot`, `HelpLevel`, `SessionStage`, `SessionTask`, and `BEGINNER_ATOMS`.

- [ ] **Step 1: Write the failing curriculum invariant tests**

Create `src/domain/curriculum/seed.test.ts`:

```ts
import { BEGINNER_ATOMS } from "./seed";

describe("BEGINNER_ATOMS", () => {
  it("has unique ids and only points to earlier prerequisites", () => {
    const seen = new Set<string>();
    for (const atom of BEGINNER_ATOMS) {
      expect(seen.has(atom.id)).toBe(false);
      expect(atom.prerequisiteIds.every((id) => seen.has(id))).toBe(true);
      seen.add(atom.id);
    }
  });

  it("labels every atom as MSA and supplies vocalized Arabic", () => {
    expect(BEGINNER_ATOMS.length).toBeGreaterThanOrEqual(8);
    for (const atom of BEGINNER_ATOMS) {
      expect(atom.register).toBe("MSA");
      expect(atom.vocalizedArabic.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify the domain is absent**

Run: `pnpm test src/domain/curriculum/seed.test.ts`
Expected: FAIL because `./seed` does not exist.

- [ ] **Step 3: Create the shared contracts**

Create `src/domain/learning/types.ts`:

```ts
export type Ability = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
export type MasteryState = "ENCOUNTERED" | "RECOGNIZED" | "RETRIEVED" | "APPLIED" | "RETAINED";
export type AtomKind = "LETTER" | "PHONEME" | "WORD" | "PHRASE" | "GRAMMAR" | "CONSTRUCTION";
export type ResponseMode = "SELECT" | "TYPE" | "SPEAK" | "WRITE";
export type HelpLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SessionStage = "ARRIVAL" | "RETRIEVAL" | "NEW_CONCEPT" | "INPUT" | "OUTPUT" | "CLOSE";

export interface KnowledgeAtom {
  id: string;
  kind: AtomKind;
  register: "MSA";
  canonicalArabic: string;
  vocalizedArabic: string;
  englishGloss: string;
  prerequisiteIds: string[];
  abilities: Ability[];
}

export interface EvidenceEvent {
  id: string;
  learnerId: string;
  atomId: string;
  ability: Ability;
  occurredAt: string;
  correct: boolean;
  responseMode: ResponseMode;
  helpLevel: HelpLevel;
  latencyMs: number;
  confidence: 1 | 2 | 3 | 4 | 5;
  novelContext: boolean;
  analysisConfidence: number | null;
}

export interface MasterySnapshot {
  learnerId: string;
  atomId: string;
  ability: Ability;
  state: MasteryState;
  successfulRetrievals: number;
  lastAttemptAt: string | null;
  lastSuccessfulRetrievalAt: string | null;
  nextReviewAt: string;
}

export type TaskKind = "CALIBRATION" | "RECALL" | "LESSON" | "READ" | "PRODUCE" | "JOURNAL";

export interface SessionTask {
  id: string;
  stage: SessionStage;
  kind: TaskKind;
  atomIds: string[];
  prompt: string;
  promptArabic: string | null;
  expectedAnswer: string | null;
  estimatedMinutes: number;
}

export interface SessionPlan {
  id: string;
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  createdAt: string;
  tasks: SessionTask[];
}

export interface StudySessionView {
  plan: SessionPlan;
  currentTaskIndex: number;
  status: "ACTIVE" | "COMPLETE";
}
```

- [ ] **Step 4: Add the ordered seed curriculum**

Create `src/domain/curriculum/seed.ts`:

```ts
import type { KnowledgeAtom } from "@/domain/learning/types";

export const BEGINNER_ATOMS: KnowledgeAtom[] = [
  { id: "letter-ba", kind: "LETTER", register: "MSA", canonicalArabic: "ب", vocalizedArabic: "بَ", englishGloss: "letter baa", prerequisiteIds: [], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-bab", kind: "WORD", register: "MSA", canonicalArabic: "باب", vocalizedArabic: "بَاب", englishGloss: "door", prerequisiteIds: ["letter-ba"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-bayt", kind: "WORD", register: "MSA", canonicalArabic: "بيت", vocalizedArabic: "بَيْت", englishGloss: "house", prerequisiteIds: ["letter-ba"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-kitab", kind: "WORD", register: "MSA", canonicalArabic: "كتاب", vocalizedArabic: "كِتَاب", englishGloss: "book", prerequisiteIds: ["letter-ba"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "word-maktaba", kind: "WORD", register: "MSA", canonicalArabic: "مكتبة", vocalizedArabic: "مَكْتَبَة", englishGloss: "library", prerequisiteIds: ["word-kitab"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "pronoun-ana", kind: "WORD", register: "MSA", canonicalArabic: "أنا", vocalizedArabic: "أَنَا", englishGloss: "I", prerequisiteIds: [], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "verb-ataallam", kind: "WORD", register: "MSA", canonicalArabic: "أتعلم", vocalizedArabic: "أَتَعَلَّمُ", englishGloss: "I learn", prerequisiteIds: ["pronoun-ana"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
  { id: "phrase-learn-arabic", kind: "CONSTRUCTION", register: "MSA", canonicalArabic: "أنا أتعلم العربية", vocalizedArabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ", englishGloss: "I am learning Arabic", prerequisiteIds: ["pronoun-ana", "verb-ataallam"], abilities: ["READING", "LISTENING", "WRITING", "SPEAKING"] },
];
```

- [ ] **Step 5: Verify contracts and curriculum**

Run: `pnpm test src/domain/curriculum/seed.test.ts && pnpm typecheck && pnpm lint`
Expected: 2 tests pass and all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/domain
git commit -m "feat: define beginner learning contracts"
```

---

### Task 3: Implement the immutable-evidence mastery reducer

**Files:**
- Create: `src/domain/mastery/apply-evidence.ts`
- Create: `src/domain/mastery/apply-evidence.test.ts`

**Interfaces:**
- Consumes: `EvidenceEvent` and `MasterySnapshot` from `src/domain/learning/types.ts`.
- Produces: `createInitialSnapshot(learnerId, atomId, ability, now)` and `applyEvidence(snapshot, event)`.

- [ ] **Step 1: Write failing state-transition tests**

Create `src/domain/mastery/apply-evidence.test.ts`:

```ts
import { applyEvidence, createInitialSnapshot } from "./apply-evidence";
import type { EvidenceEvent } from "@/domain/learning/types";

const baseEvent: EvidenceEvent = {
  id: "event-1", learnerId: "learner-1", atomId: "word-kitab", ability: "WRITING",
  occurredAt: "2026-07-11T10:00:00.000Z", correct: true, responseMode: "TYPE",
  helpLevel: 0, latencyMs: 2200, confidence: 4, novelContext: false, analysisConfidence: null,
};

describe("applyEvidence", () => {
  it("moves unaided production to retrieved", () => {
    const initial = createInitialSnapshot("learner-1", "word-kitab", "WRITING", "2026-07-11T09:00:00.000Z");
    expect(applyEvidence(initial, baseEvent).state).toBe("RETRIEVED");
  });

  it("moves a novel unaided production to applied", () => {
    const initial = createInitialSnapshot("learner-1", "word-kitab", "WRITING", "2026-07-11T09:00:00.000Z");
    expect(applyEvidence(initial, { ...baseEvent, novelContext: true }).state).toBe("APPLIED");
  });

  it("does not penalize low-confidence machine analysis", () => {
    const initial = { ...createInitialSnapshot("learner-1", "word-kitab", "SPEAKING", "2026-07-01T09:00:00.000Z"), state: "APPLIED" as const };
    const result = applyEvidence(initial, { ...baseEvent, ability: "SPEAKING", correct: false, responseMode: "SPEAK", analysisConfidence: 0.4 });
    expect(result).toEqual(initial);
  });

  it("requires delayed repeated retrieval for retained", () => {
    const initial = { ...createInitialSnapshot("learner-1", "word-kitab", "WRITING", "2026-07-01T09:00:00.000Z"), state: "APPLIED" as const, successfulRetrievals: 2, lastSuccessfulRetrievalAt: "2026-07-01T10:00:00.000Z" };
    expect(applyEvidence(initial, baseEvent).state).toBe("RETAINED");
  });
});
```

- [ ] **Step 2: Run the tests and verify the reducer is missing**

Run: `pnpm test src/domain/mastery/apply-evidence.test.ts`
Expected: FAIL because `./apply-evidence` does not exist.

- [ ] **Step 3: Implement deterministic transitions**

Create `src/domain/mastery/apply-evidence.ts`:

```ts
import type { Ability, EvidenceEvent, MasterySnapshot, MasteryState } from "@/domain/learning/types";

const DAY_MS = 86_400_000;

export function createInitialSnapshot(
  learnerId: string,
  atomId: string,
  ability: Ability,
  now: string,
): MasterySnapshot {
  return { learnerId, atomId, ability, state: "ENCOUNTERED", successfulRetrievals: 0, lastAttemptAt: null, lastSuccessfulRetrievalAt: null, nextReviewAt: now };
}

function nextReview(occurredAt: string, successfulRetrievals: number): string {
  const gaps = [1, 2, 4, 7, 14, 30];
  const days = gaps[Math.min(successfulRetrievals, gaps.length - 1)];
  return new Date(Date.parse(occurredAt) + days * DAY_MS).toISOString();
}

export function applyEvidence(snapshot: MasterySnapshot, event: EvidenceEvent): MasterySnapshot {
  if (snapshot.learnerId !== event.learnerId || snapshot.atomId !== event.atomId || snapshot.ability !== event.ability) {
    throw new Error("Evidence does not match mastery snapshot");
  }
  if (event.analysisConfidence !== null && event.analysisConfidence < 0.7) return snapshot;

  if (!event.correct) {
    return { ...snapshot, lastAttemptAt: event.occurredAt, nextReviewAt: event.occurredAt };
  }

  const unaidedProduction = event.helpLevel === 0 && ["TYPE", "SPEAK", "WRITE"].includes(event.responseMode);
  const successfulRetrievals = snapshot.successfulRetrievals + (unaidedProduction ? 1 : 0);
  const delayedDays = snapshot.lastSuccessfulRetrievalAt
    ? (Date.parse(event.occurredAt) - Date.parse(snapshot.lastSuccessfulRetrievalAt)) / DAY_MS
    : 0;
  let state: MasteryState = snapshot.state === "ENCOUNTERED" ? "RECOGNIZED" : snapshot.state;
  if (unaidedProduction) state = event.novelContext ? "APPLIED" : "RETRIEVED";
  if (successfulRetrievals >= 3 && delayedDays >= 7) state = "RETAINED";

  return {
    ...snapshot,
    state,
    successfulRetrievals,
    lastAttemptAt: event.occurredAt,
    lastSuccessfulRetrievalAt: unaidedProduction ? event.occurredAt : snapshot.lastSuccessfulRetrievalAt,
    nextReviewAt: nextReview(event.occurredAt, successfulRetrievals),
  };
}
```

- [ ] **Step 4: Verify mastery behavior**

Run: `pnpm test src/domain/mastery/apply-evidence.test.ts && pnpm test && pnpm typecheck && pnpm lint`
Expected: 4 focused tests pass; the full suite and static checks exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain/mastery
git commit -m "feat: derive mastery from immutable evidence"
```

---

### Task 4: Score retrieval candidates without collapsing ability dimensions

**Files:**
- Create: `src/domain/scheduling/retrieval.ts`
- Create: `src/domain/scheduling/retrieval.test.ts`

**Interfaces:**
- Consumes: `MasterySnapshot[]`.
- Produces: `rankRetrievalCandidates(snapshots, now, limit): MasterySnapshot[]`.

- [ ] **Step 1: Write failing ranking tests**

Create `src/domain/scheduling/retrieval.test.ts`:

```ts
import { rankRetrievalCandidates } from "./retrieval";
import type { MasterySnapshot } from "@/domain/learning/types";

const snapshot = (ability: MasterySnapshot["ability"], state: MasterySnapshot["state"], nextReviewAt: string): MasterySnapshot => ({
  learnerId: "learner-1", atomId: `kitab-${ability}`, ability, state,
  successfulRetrievals: state === "RETAINED" ? 3 : 1,
  lastAttemptAt: "2026-07-01T00:00:00.000Z",
  lastSuccessfulRetrievalAt: "2026-07-01T00:00:00.000Z",
  nextReviewAt,
});

it("ranks overdue weak abilities before retained future abilities", () => {
  const ranked = rankRetrievalCandidates([
    snapshot("READING", "RETAINED", "2026-07-20T00:00:00.000Z"),
    snapshot("SPEAKING", "RECOGNIZED", "2026-07-05T00:00:00.000Z"),
    snapshot("WRITING", "RETRIEVED", "2026-07-10T00:00:00.000Z"),
  ], "2026-07-11T00:00:00.000Z", 2);
  expect(ranked.map((item) => item.ability)).toEqual(["SPEAKING", "WRITING"]);
});
```

- [ ] **Step 2: Run the test and verify the ranker is absent**

Run: `pnpm test src/domain/scheduling/retrieval.test.ts`
Expected: FAIL because `./retrieval` does not exist.

- [ ] **Step 3: Implement explicit scoring**

Create `src/domain/scheduling/retrieval.ts`:

```ts
import type { MasterySnapshot, MasteryState } from "@/domain/learning/types";

const weakness: Record<MasteryState, number> = {
  ENCOUNTERED: 5,
  RECOGNIZED: 4,
  RETRIEVED: 3,
  APPLIED: 2,
  RETAINED: 1,
};

export function rankRetrievalCandidates(
  snapshots: MasterySnapshot[],
  now: string,
  limit: number,
): MasterySnapshot[] {
  const nowMs = Date.parse(now);
  return [...snapshots]
    .map((item) => {
      const overdueDays = Math.max(0, (nowMs - Date.parse(item.nextReviewAt)) / 86_400_000);
      return { item, score: weakness[item.state] * 100 + overdueDays };
    })
    .filter(({ item }) => Date.parse(item.nextReviewAt) <= nowMs)
    .sort((a, b) => b.score - a.score || a.item.atomId.localeCompare(b.item.atomId))
    .slice(0, limit)
    .map(({ item }) => item);
}
```

- [ ] **Step 4: Verify retrieval ordering**

Run: `pnpm test src/domain/scheduling/retrieval.test.ts && pnpm test && pnpm typecheck && pnpm lint`
Expected: focused and full suites pass; static checks exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain/scheduling
git commit -m "feat: rank ability-specific retrieval"
```

---

### Task 5: Build deterministic 30-, 45-, and 60-minute session plans

**Files:**
- Create: `src/domain/sessions/build-session-plan.ts`
- Create: `src/domain/sessions/build-session-plan.test.ts`

**Interfaces:**
- Consumes: `KnowledgeAtom[]`, `MasterySnapshot[]`, `rankRetrievalCandidates`, learner id, duration, and ISO timestamp.
- Produces: `buildSessionPlan(input): SessionPlan` with all six stages and an exact duration total.

- [ ] **Step 1: Write failing duration and stage tests**

Create `src/domain/sessions/build-session-plan.test.ts`:

```ts
import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { buildSessionPlan } from "./build-session-plan";

describe.each([30, 45, 60] as const)("%i-minute plan", (durationMinutes) => {
  it("preserves all six stages and the exact duration", () => {
    const plan = buildSessionPlan({
      learnerId: "learner-1",
      durationMinutes,
      now: "2026-07-11T10:00:00.000Z",
      atoms: BEGINNER_ATOMS,
      mastery: [],
    });
    expect(new Set(plan.tasks.map((task) => task.stage))).toEqual(new Set(["ARRIVAL", "RETRIEVAL", "NEW_CONCEPT", "INPUT", "OUTPUT", "CLOSE"]));
    expect(plan.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBe(durationMinutes);
  });
});
```

- [ ] **Step 2: Run the test and verify the planner is absent**

Run: `pnpm test src/domain/sessions/build-session-plan.test.ts`
Expected: FAIL because `./build-session-plan` does not exist.

- [ ] **Step 3: Implement the stable session shape**

Create `src/domain/sessions/build-session-plan.ts`:

```ts
import type { KnowledgeAtom, MasterySnapshot, SessionPlan, SessionStage, SessionTask } from "@/domain/learning/types";
import { rankRetrievalCandidates } from "@/domain/scheduling/retrieval";

const durations: Record<30 | 45 | 60, Record<SessionStage, number>> = {
  30: { ARRIVAL: 2, RETRIEVAL: 7, NEW_CONCEPT: 6, INPUT: 5, OUTPUT: 7, CLOSE: 3 },
  45: { ARRIVAL: 3, RETRIEVAL: 8, NEW_CONCEPT: 9, INPUT: 9, OUTPUT: 12, CLOSE: 4 },
  60: { ARRIVAL: 3, RETRIEVAL: 10, NEW_CONCEPT: 12, INPUT: 12, OUTPUT: 18, CLOSE: 5 },
};

export interface BuildSessionPlanInput {
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  now: string;
  atoms: KnowledgeAtom[];
  mastery: MasterySnapshot[];
}

export function buildSessionPlan(input: BuildSessionPlanInput): SessionPlan {
  const due = rankRetrievalCandidates(input.mastery, input.now, 4);
  const unlocked = input.atoms.find((atom) => atom.prerequisiteIds.every((id) => input.mastery.some((item) => item.atomId === id && ["RETRIEVED", "APPLIED", "RETAINED"].includes(item.state)))) ?? input.atoms[0];
  const stageMinutes = durations[input.durationMinutes];
  const tasks: SessionTask[] = [
    { id: "arrival-1", stage: "ARRIVAL", kind: "CALIBRATION", atomIds: [], prompt: "Read one familiar Arabic form aloud, then set your study intention.", promptArabic: "بَ", expectedAnswer: null, estimatedMinutes: stageMinutes.ARRIVAL },
    { id: "retrieval-1", stage: "RETRIEVAL", kind: "RECALL", atomIds: due.map((item) => item.atomId), prompt: "Produce the Arabic before asking for help.", promptArabic: null, expectedAnswer: null, estimatedMinutes: stageMinutes.RETRIEVAL },
    { id: "concept-1", stage: "NEW_CONCEPT", kind: "LESSON", atomIds: [unlocked.id], prompt: `Notice, compare, explain, and use: ${unlocked.englishGloss}.`, promptArabic: unlocked.vocalizedArabic, expectedAnswer: unlocked.canonicalArabic, estimatedMinutes: stageMinutes.NEW_CONCEPT },
    { id: "input-1", stage: "INPUT", kind: "READ", atomIds: [unlocked.id], prompt: "Read for meaning. Use the help ladder only when blocked.", promptArabic: "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ كُلَّ صَبَاحٍ.", expectedAnswer: null, estimatedMinutes: stageMinutes.INPUT },
    { id: "output-1", stage: "OUTPUT", kind: "PRODUCE", atomIds: [unlocked.id], prompt: "Write one new sentence about your own Arabic study.", promptArabic: null, expectedAnswer: null, estimatedMinutes: stageMinutes.OUTPUT },
    { id: "close-1", stage: "CLOSE", kind: "JOURNAL", atomIds: [], prompt: "Write a one-minute Arabic journal entry and name what may be forgotten.", promptArabic: null, expectedAnswer: null, estimatedMinutes: stageMinutes.CLOSE },
  ];
  return { id: `session-${input.learnerId}-${input.now}`, learnerId: input.learnerId, durationMinutes: input.durationMinutes, createdAt: input.now, tasks };
}
```

- [ ] **Step 4: Verify all session lengths**

Run: `pnpm test src/domain/sessions/build-session-plan.test.ts && pnpm test && pnpm typecheck && pnpm lint`
Expected: 3 focused cases pass; full suite and static checks exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain/sessions
git commit -m "feat: plan focused study sessions"
```

---


### Task 6: Persist resumable sessions and immutable evidence in PostgreSQL

**Files:**
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `prisma.config.ts`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/server/db.ts`
- Create: `src/server/repositories/study-repository.ts`
- Create: `tests/integration/study-repository.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `BEGINNER_ATOMS`, `buildSessionPlan`, `createInitialSnapshot`, and `applyEvidence`.
- Produces: `startOrResumeSession(input): Promise<StudySessionView>`, `recordEvidence(input): Promise<MasterySnapshot>`, `getAbilityCounts(learnerId): Promise<Record<Ability, number>>`, and `advanceSession(sessionId, nextTaskIndex): Promise<void>`.

- [ ] **Step 1: Define local PostgreSQL and Prisma configuration**

Create `compose.yaml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: nawa
      POSTGRES_USER: nawa
      POSTGRES_PASSWORD: nawa_local
    ports:
      - "5439:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nawa -d nawa"]
      interval: 2s
      timeout: 2s
      retries: 20
```

Create `.env.example`:

```dotenv
DATABASE_URL=postgresql://nawa:nawa_local@localhost:5439/nawa
ENABLE_DEMO_LEARNER=true
DEMO_LEARNER_ID=00000000-0000-4000-8000-000000000001
```

Create `prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
```

- [ ] **Step 2: Create the persistence schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Ability {
  READING
  LISTENING
  WRITING
  SPEAKING
}

enum MasteryState {
  ENCOUNTERED
  RECOGNIZED
  RETRIEVED
  APPLIED
  RETAINED
}

enum SessionStatus {
  ACTIVE
  COMPLETE
}

model Learner {
  id        String            @id @db.Uuid
  createdAt DateTime          @default(now())
  mastery   MasterySnapshot[]
  evidence  EvidenceEvent[]
  sessions  StudySession[]
}

model KnowledgeAtomRecord {
  id      String @id
  payload Json
}

model MasterySnapshot {
  learnerId                String
  atomId                   String
  ability                  Ability
  state                    MasteryState
  successfulRetrievals     Int          @default(0)
  lastAttemptAt            DateTime?
  lastSuccessfulRetrievalAt DateTime?
  nextReviewAt             DateTime
  learner                  Learner      @relation(fields: [learnerId], references: [id], onDelete: Cascade)

  @@id([learnerId, atomId, ability])
  @@index([learnerId, nextReviewAt])
}

model EvidenceEvent {
  id                 String   @id @db.Uuid
  learnerId          String
  sessionId          String   @db.Uuid
  taskId             String
  atomId             String
  ability            Ability
  occurredAt         DateTime
  correct            Boolean
  responseMode       String
  helpLevel          Int
  latencyMs          Int
  confidence         Int
  novelContext       Boolean
  analysisConfidence Float?
  learner            Learner  @relation(fields: [learnerId], references: [id], onDelete: Cascade)
  session            StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([learnerId, atomId, ability, occurredAt])
}

model StudySession {
  id               String        @id @default(uuid()) @db.Uuid
  learnerId        String
  durationMinutes  Int
  plan             Json
  currentTaskIndex Int           @default(0)
  status           SessionStatus @default(ACTIVE)
  startedAt        DateTime
  updatedAt        DateTime      @updatedAt
  learner          Learner       @relation(fields: [learnerId], references: [id], onDelete: Cascade)
  evidence         EvidenceEvent[]

  @@index([learnerId, status, updatedAt])
}
```

- [ ] **Step 3: Write the failing repository integration test**

Create `tests/integration/study-repository.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { advanceSession, recordEvidence, startOrResumeSession } from "@/server/repositories/study-repository";

const learnerId = "00000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  await db.learner.upsert({ where: { id: learnerId }, update: {}, create: { id: learnerId } });
});

afterEach(async () => {
  await db.evidenceEvent.deleteMany({ where: { learnerId } });
  await db.studySession.deleteMany({ where: { learnerId } });
  await db.masterySnapshot.deleteMany({ where: { learnerId } });
});

afterAll(() => db.$disconnect());

it("resumes the active session and derives mastery from one immutable event", async () => {
  const first = await startOrResumeSession({ learnerId, durationMinutes: 30, now: "2026-07-11T10:00:00.000Z" });
  await advanceSession(first.plan.id, 2);
  const resumed = await startOrResumeSession({ learnerId, durationMinutes: 30, now: "2026-07-11T10:05:00.000Z" });
  expect(resumed.plan.id).toBe(first.plan.id);
  expect(resumed.currentTaskIndex).toBe(2);

  const mastery = await recordEvidence({
    sessionId: first.plan.id,
    taskId: "concept-1",
    event: {
      id: randomUUID(), learnerId, atomId: "letter-ba", ability: "WRITING",
      occurredAt: "2026-07-11T10:06:00.000Z", correct: true, responseMode: "TYPE",
      helpLevel: 0, latencyMs: 1800, confidence: 4, novelContext: false, analysisConfidence: null,
    },
  });
  expect(mastery.state).toBe("RETRIEVED");
  expect(await db.evidenceEvent.count({ where: { learnerId } })).toBe(1);
});
```

- [ ] **Step 4: Start PostgreSQL and verify the repository is missing**

Run:

```bash
cp .env.example .env
docker compose up -d db
pnpm db:generate
pnpm prisma migrate dev --name initial_learning_state
pnpm test tests/integration/study-repository.test.ts
```

Expected: the migration succeeds, then the test FAILS because `src/server/db.ts` and the repository do not exist.

- [ ] **Step 5: Implement the Prisma adapter singleton**

Create `src/server/db.ts`:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDb = globalThis as unknown as { nawaDb?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const db = globalForDb.nawaDb ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForDb.nawaDb = db;
```

- [ ] **Step 6: Implement transactional repository operations**

Create `src/server/repositories/study-repository.ts` with these exported signatures and transaction rules:

```ts
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { Ability, EvidenceEvent, MasterySnapshot, SessionPlan, StudySessionView } from "@/domain/learning/types";
import { BEGINNER_ATOMS } from "@/domain/curriculum/seed";
import { applyEvidence, createInitialSnapshot } from "@/domain/mastery/apply-evidence";
import { buildSessionPlan } from "@/domain/sessions/build-session-plan";
import { db } from "@/server/db";

export async function startOrResumeSession(input: {
  learnerId: string;
  durationMinutes: 30 | 45 | 60;
  now: string;
}): Promise<StudySessionView> {
  const active = await db.studySession.findFirst({
    where: { learnerId: input.learnerId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
  if (active) return {
    plan: active.plan as unknown as SessionPlan,
    currentTaskIndex: active.currentTaskIndex,
    status: active.status,
  };

  const rows = await db.masterySnapshot.findMany({ where: { learnerId: input.learnerId } });
  const mastery = rows.map((row) => ({
    ...row,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    lastSuccessfulRetrievalAt: row.lastSuccessfulRetrievalAt?.toISOString() ?? null,
    nextReviewAt: row.nextReviewAt.toISOString(),
  })) as MasterySnapshot[];
  const sessionId = randomUUID();
  const draft = buildSessionPlan({ ...input, atoms: BEGINNER_ATOMS, mastery });
  const plan = { ...draft, id: sessionId };
  await db.studySession.create({
    data: {
      id: sessionId,
      learnerId: input.learnerId,
      durationMinutes: input.durationMinutes,
      plan: plan as unknown as Prisma.InputJsonValue,
      startedAt: new Date(input.now),
    },
  });
  return { plan, currentTaskIndex: 0, status: "ACTIVE" };
}

export async function recordEvidence(input: {
  sessionId: string;
  taskId: string;
  event: EvidenceEvent;
}): Promise<MasterySnapshot> {
  return db.$transaction(async (tx) => {
    const existing = await tx.masterySnapshot.findUnique({
      where: { learnerId_atomId_ability: { learnerId: input.event.learnerId, atomId: input.event.atomId, ability: input.event.ability } },
    });
    const initial = existing ? ({
      ...existing,
      lastAttemptAt: existing.lastAttemptAt?.toISOString() ?? null,
      lastSuccessfulRetrievalAt: existing.lastSuccessfulRetrievalAt?.toISOString() ?? null,
      nextReviewAt: existing.nextReviewAt.toISOString(),
    } as MasterySnapshot) : createInitialSnapshot(input.event.learnerId, input.event.atomId, input.event.ability, input.event.occurredAt);
    const next = applyEvidence(initial, input.event);

    await tx.evidenceEvent.create({
      data: {
        ...input.event,
        sessionId: input.sessionId,
        taskId: input.taskId,
        occurredAt: new Date(input.event.occurredAt),
      },
    });
    await tx.masterySnapshot.upsert({
      where: { learnerId_atomId_ability: { learnerId: next.learnerId, atomId: next.atomId, ability: next.ability } },
      update: {
        state: next.state, successfulRetrievals: next.successfulRetrievals,
        lastAttemptAt: next.lastAttemptAt ? new Date(next.lastAttemptAt) : null,
        lastSuccessfulRetrievalAt: next.lastSuccessfulRetrievalAt ? new Date(next.lastSuccessfulRetrievalAt) : null,
        nextReviewAt: new Date(next.nextReviewAt),
      },
      create: {
        learnerId: next.learnerId, atomId: next.atomId, ability: next.ability,
        state: next.state, successfulRetrievals: next.successfulRetrievals,
        lastAttemptAt: next.lastAttemptAt ? new Date(next.lastAttemptAt) : null,
        lastSuccessfulRetrievalAt: next.lastSuccessfulRetrievalAt ? new Date(next.lastSuccessfulRetrievalAt) : null,
        nextReviewAt: new Date(next.nextReviewAt),
      },
    });
    return next;
  });
}

export async function advanceSession(sessionId: string, nextTaskIndex: number): Promise<void> {
  const session = await db.studySession.findUniqueOrThrow({ where: { id: sessionId } });
  const plan = session.plan as unknown as SessionPlan;
  await db.studySession.update({
    where: { id: sessionId },
    data: { currentTaskIndex: nextTaskIndex, status: nextTaskIndex >= plan.tasks.length ? "COMPLETE" : "ACTIVE" },
  });
}

export async function getAbilityCounts(learnerId: string): Promise<Record<Ability, number>> {
  const rows = await db.masterySnapshot.groupBy({
    by: ["ability"],
    where: { learnerId, state: { in: ["RETRIEVED", "APPLIED", "RETAINED"] } },
    _count: { _all: true },
  });
  const counts: Record<Ability, number> = { READING: 0, LISTENING: 0, WRITING: 0, SPEAKING: 0 };
  for (const row of rows) counts[row.ability] = row._count._all;
  return counts;
}
```

- [ ] **Step 7: Add the deterministic seed**

Create `prisma/seed.ts`:

```ts
import { Prisma } from "../src/generated/prisma/client";
import { BEGINNER_ATOMS } from "../src/domain/curriculum/seed";
import { db } from "../src/server/db";

const learnerId = process.env.DEMO_LEARNER_ID ?? "00000000-0000-4000-8000-000000000001";

async function main() {
  await db.learner.upsert({ where: { id: learnerId }, update: {}, create: { id: learnerId } });
  for (const atom of BEGINNER_ATOMS) {
    const payload = atom as unknown as Prisma.InputJsonValue;
    await db.knowledgeAtomRecord.upsert({
      where: { id: atom.id },
      update: { payload },
      create: { id: atom.id, payload },
    });
  }
}

main().then(() => db.$disconnect()).catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
```

- [ ] **Step 8: Verify persistence**

Run: `pnpm db:seed && pnpm test tests/integration/study-repository.test.ts && pnpm test && pnpm typecheck && pnpm lint`
Expected: the focused integration test passes, the full suite passes, and static checks exit 0.

- [ ] **Step 9: Commit**

```bash
git add compose.yaml .env.example prisma.config.ts prisma src/server tests/integration package.json pnpm-lock.yaml
git commit -m "feat: persist study sessions and evidence"
```

---

### Task 7: Expose validated start, resume, attempt, and advance APIs

**Files:**
- Create: `src/server/demo-learner.ts`
- Create: `src/app/api/study/sessions/route.ts`
- Create: `src/app/api/study/sessions/route.test.ts`
- Create: `src/app/api/study/sessions/[sessionId]/attempts/route.ts`
- Create: `src/app/api/study/sessions/[sessionId]/attempts/route.test.ts`

**Interfaces:**
- Consumes: repository functions from Task 6.
- Produces: `POST /api/study/sessions` and `POST /api/study/sessions/:sessionId/attempts` JSON contracts.

- [ ] **Step 1: Write failing route tests**

Create `src/app/api/study/sessions/route.test.ts`:

```ts
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { startOrResumeSession } from "@/server/repositories/study-repository";

vi.mock("@/server/demo-learner", () => ({ getDemoLearnerId: () => "00000000-0000-4000-8000-000000000001" }));
vi.mock("@/server/repositories/study-repository", () => ({ startOrResumeSession: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("starts a validated 30-minute session", async () => {
  vi.mocked(startOrResumeSession).mockResolvedValue({
    currentTaskIndex: 0,
    status: "ACTIVE",
    plan: {
      id: "00000000-0000-4000-8000-000000000100",
      learnerId: "00000000-0000-4000-8000-000000000001",
      durationMinutes: 30,
      createdAt: "2026-07-11T10:00:00.000Z",
      tasks: ["ARRIVAL", "RETRIEVAL", "NEW_CONCEPT", "INPUT", "OUTPUT", "CLOSE"].map((stage, index) => ({
        id: `task-${index}`, stage: stage as "ARRIVAL", kind: "CALIBRATION", atomIds: [],
        prompt: stage, promptArabic: null, expectedAnswer: null, estimatedMinutes: 5,
      })),
    },
  });
  const response = await POST(new Request("http://nawa.test/api/study/sessions", {
    method: "POST", body: JSON.stringify({ durationMinutes: 30 }),
  }));
  expect(response.status).toBe(201);
  expect((await response.json()).plan.tasks.map((task: { stage: string }) => task.stage)).toEqual([
    "ARRIVAL", "RETRIEVAL", "NEW_CONCEPT", "INPUT", "OUTPUT", "CLOSE",
  ]);
});
```

Create `src/app/api/study/sessions/[sessionId]/attempts/route.test.ts`:

```ts
import { expect, it, vi } from "vitest";
import { POST } from "./route";
import { advanceSession, getAbilityCounts, recordEvidence } from "@/server/repositories/study-repository";

vi.mock("@/server/demo-learner", () => ({ getDemoLearnerId: () => "00000000-0000-4000-8000-000000000001" }));
vi.mock("@/server/repositories/study-repository", () => ({ recordEvidence: vi.fn(), advanceSession: vi.fn(), getAbilityCounts: vi.fn() }));

it("records one ability-specific event before advancing", async () => {
  vi.mocked(recordEvidence).mockResolvedValue({
    learnerId: "00000000-0000-4000-8000-000000000001", atomId: "letter-ba", ability: "WRITING",
    state: "RETRIEVED", successfulRetrievals: 1, lastAttemptAt: "2026-07-11T10:06:00.000Z",
    lastSuccessfulRetrievalAt: "2026-07-11T10:06:00.000Z", nextReviewAt: "2026-07-13T10:06:00.000Z",
  });
  vi.mocked(getAbilityCounts).mockResolvedValue({ READING: 8, LISTENING: 5, WRITING: 3, SPEAKING: 2 });
  const body = {
    taskId: "concept-1", nextTaskIndex: 3,
    event: {
      id: "00000000-0000-4000-8000-000000000200", learnerId: "00000000-0000-4000-8000-000000000001",
      atomId: "letter-ba", ability: "WRITING", occurredAt: "2026-07-11T10:06:00.000Z",
      correct: true, responseMode: "TYPE", helpLevel: 0, latencyMs: 1800,
      confidence: 4, novelContext: false, analysisConfidence: null,
    },
  };
  const response = await POST(new Request("http://nawa.test", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ sessionId: "00000000-0000-4000-8000-000000000100" }),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).mastery.ability).toBe("WRITING");
  expect(advanceSession).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000100", 3);
});
```

- [ ] **Step 2: Run route tests and verify both handlers are absent**

Run: `pnpm test src/app/api/study`
Expected: FAIL because both route modules do not exist.

- [ ] **Step 3: Add the development-only learner boundary**

Create `src/server/demo-learner.ts`:

```ts
export function getDemoLearnerId(): string {
  if (process.env.ENABLE_DEMO_LEARNER !== "true" || !process.env.DEMO_LEARNER_ID) {
    throw new Error("Demo learner is disabled; Plan 2 account authentication is required");
  }
  return process.env.DEMO_LEARNER_ID;
}
```

- [ ] **Step 4: Implement the session route**

Create `src/app/api/study/sessions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoLearnerId } from "@/server/demo-learner";
import { startOrResumeSession } from "@/server/repositories/study-repository";

const bodySchema = z.object({ durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "durationMinutes must be 30, 45, or 60" }, { status: 400 });
  try {
    const plan = await startOrResumeSession({ learnerId: getDemoLearnerId(), durationMinutes: parsed.data.durationMinutes, now: new Date().toISOString() });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start session" }, { status: 503 });
  }
}
```

- [ ] **Step 5: Implement the attempt route**

Create `src/app/api/study/sessions/[sessionId]/attempts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoLearnerId } from "@/server/demo-learner";
import { advanceSession, getAbilityCounts, recordEvidence } from "@/server/repositories/study-repository";

const eventSchema = z.object({
  id: z.uuid(), learnerId: z.uuid(), atomId: z.string().min(1),
  ability: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  occurredAt: z.iso.datetime(), correct: z.boolean(),
  responseMode: z.enum(["SELECT", "TYPE", "SPEAK", "WRITE"]),
  helpLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  latencyMs: z.number().int().nonnegative(), confidence: z.number().int().min(1).max(5),
  novelContext: z.boolean(), analysisConfidence: z.number().min(0).max(1).nullable(),
});
const bodySchema = z.object({ taskId: z.string().min(1), nextTaskIndex: z.number().int().nonnegative(), event: eventSchema.nullable() });

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempt payload" }, { status: 400 });
  const learnerId = getDemoLearnerId();
  if (parsed.data.event && parsed.data.event.learnerId !== learnerId) {
    return NextResponse.json({ error: "Attempt does not belong to the active learner" }, { status: 403 });
  }
  try {
    const { sessionId } = await context.params;
    const mastery = parsed.data.event
      ? await recordEvidence({ sessionId, taskId: parsed.data.taskId, event: parsed.data.event })
      : null;
    await advanceSession(sessionId, parsed.data.nextTaskIndex);
    const counts = await getAbilityCounts(learnerId);
    return NextResponse.json({ mastery, counts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record attempt" }, { status: 503 });
  }
}
```

- [ ] **Step 6: Verify route contracts**

Run: `pnpm test src/app/api/study && pnpm test && pnpm typecheck && pnpm lint`
Expected: route tests and the full suite pass; static checks exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/server/demo-learner.ts src/app/api
git commit -m "feat: expose validated study APIs"
```

---

### Task 8: Build the responsive focused Study Room shell

**Files:**
- Create: `src/features/study-room/stage-rail.tsx`
- Create: `src/features/study-room/task-card.tsx`
- Create: `src/features/study-room/use-study-session.ts`
- Create: `src/features/study-room/study-room.tsx`
- Create: `src/features/study-room/study-room.test.tsx`
- Create: `src/app/study/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `StudySessionView`, `SessionTask`, and `POST /api/study/sessions`.
- Produces: `StudyRoom` responsive interaction and `useStudySession(durationMinutes)`.

- [ ] **Step 1: Write the failing focused-layout component test**

Create a test that mocks `fetch` with `{ plan: thirtyMinutePlan, currentTaskIndex: 0, status: "ACTIVE" } satisfies StudySessionView`, renders `<StudyRoom durationMinutes={30} />`, and asserts:

```tsx
expect(await screen.findByRole("heading", { name: "Arrival" })).toBeVisible();
expect(screen.getByText("2 min")).toBeVisible();
expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and verify the Study Room is absent**

Run: `pnpm test src/features/study-room/study-room.test.tsx`
Expected: FAIL because `study-room.tsx` does not exist.

- [ ] **Step 3: Implement the session hook**

Create `src/features/study-room/use-study-session.ts`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StudySessionView } from "@/domain/learning/types";

export function useStudySession(durationMinutes: 30 | 45 | 60) {
  const [view, setView] = useState<StudySessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/api/study/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ durationMinutes }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load your study session");
        setView(body as StudySessionView);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load your study session");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [durationMinutes, requestKey]);

  const currentTask = useMemo(() => view?.plan.tasks[view.currentTaskIndex] ?? null, [view]);
  const advance = useCallback(() => setView((current) => current ? {
    ...current,
    currentTaskIndex: Math.min(current.currentTaskIndex + 1, current.plan.tasks.length),
  } : current), []);
  const retry = useCallback(() => setRequestKey((value) => value + 1), []);

  return { view, currentTask, loading, error, advance, retry };
}
```

- [ ] **Step 4: Implement semantic responsive components**

Create `src/features/study-room/stage-rail.tsx`:

```tsx
import type { SessionStage } from "@/domain/learning/types";

const labels: Record<SessionStage, string> = {
  ARRIVAL: "Arrival", RETRIEVAL: "Retrieval", NEW_CONCEPT: "New concept",
  INPUT: "Input", OUTPUT: "Output", CLOSE: "Close",
};

export function StageRail({ active }: { active: SessionStage }) {
  return <nav aria-label="Study stages"><ol>{Object.entries(labels).map(([stage, label]) => (
    <li key={stage} aria-current={stage === active ? "step" : undefined}>{label}</li>
  ))}</ol></nav>;
}
```

Create `src/features/study-room/task-card.tsx`:

```tsx
import { useState } from "react";
import type { SessionTask } from "@/domain/learning/types";

export function TaskCard({ task, onContinue }: { task: SessionTask; onContinue: () => void }) {
  const [answer, setAnswer] = useState("");
  return <section className="task-card">
    <p>{task.prompt}</p>
    {task.promptArabic ? <p className="arabic-prompt" lang="ar" dir="rtl">{task.promptArabic}</p> : null}
    <label>My answer<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} dir="auto" /></label>
    <button className="primary-action" type="button" onClick={onContinue}>Continue</button>
  </section>;
}
```

Create `src/features/study-room/study-room.tsx`:

```tsx
"use client";

import { StageRail } from "./stage-rail";
import { TaskCard } from "./task-card";
import { useStudySession } from "./use-study-session";

const stageLabels = { ARRIVAL: "Arrival", RETRIEVAL: "Retrieval", NEW_CONCEPT: "New concept", INPUT: "Input", OUTPUT: "Output", CLOSE: "Close" } as const;

export function StudyRoom({ durationMinutes }: { durationMinutes: 30 | 45 | 60 }) {
  const session = useStudySession(durationMinutes);
  if (session.loading) return <main aria-busy="true">Preparing your study room…</main>;
  if (session.error) return <main><p role="alert">{session.error}</p><button onClick={session.retry}>Retry</button></main>;
  if (!session.currentTask) return <main><h1>Session complete</h1></main>;
  const task = session.currentTask;
  return <main className="study-room">
    <StageRail active={task.stage} />
    <div className="study-canvas">
      <p aria-live="polite">{stageLabels[task.stage]}</p>
      <h1>{stageLabels[task.stage]}</h1>
      <p>{task.estimatedMinutes} min</p>
      <TaskCard task={task} onContinue={session.advance} />
    </div>
    <aside className="coach-column" aria-label="Learning coach" hidden>Learning help</aside>
  </main>;
}
```

`StageRail` renders an ordered list of all six stages with `aria-current="step"` on the active stage. `TaskCard` renders `promptArabic` with `lang="ar" dir="rtl"`. `StudyRoom` uses a `<main>` landmark, announces stage changes through `aria-live="polite"`, and keeps the single primary action at least 44px high.

Create `src/app/study/page.tsx`:

```tsx
import { StudyRoom } from "@/features/study-room/study-room";

export default function StudyPage() {
  return <StudyRoom durationMinutes={60} />;
}
```

Add to `src/app/globals.css`:

```css
.study-room { display: grid; grid-template-columns: 16rem minmax(0, 1fr) 20rem; min-height: 100vh; }
.study-room nav, .study-canvas, .coach-column { padding: 1.5rem; }
.study-room textarea { display: block; width: 100%; min-height: 9rem; margin: .5rem 0 1rem; }
.study-room button { min-height: 44px; }
.arabic-prompt { font-size: clamp(2rem, 5vw, 4.5rem); line-height: 1.6; overflow-wrap: anywhere; }
@media (max-width: 1023px) {
  .study-room { grid-template-columns: 13rem minmax(0, 1fr); }
  .coach-column { display: none; }
}
@media (max-width: 639px) {
  .study-room { display: block; max-width: 100%; overflow-x: clip; }
  .study-room nav ol { display: flex; gap: .75rem; overflow-x: auto; padding: 1rem; list-style: none; }
  .study-room nav, .study-canvas { padding: 1rem; }
}
```

No content may overflow at 375px.

- [ ] **Step 5: Verify the focused shell**

Run: `pnpm test src/features/study-room/study-room.test.tsx && pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: the focused test passes; all verification commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/study-room src/app/study src/app/globals.css
git commit -m "feat: add responsive Study Room shell"
```

---

### Task 9: Add the ordered help ladder and progressive diacritics

**Files:**
- Create: `src/features/study-room/coach-panel.tsx`
- Create: `src/features/study-room/coach-panel.test.tsx`
- Create: `src/features/study-room/diacritic-text.tsx`
- Create: `src/features/study-room/diacritic-text.test.tsx`
- Modify: `src/features/study-room/task-card.tsx`
- Modify: `src/features/study-room/study-room.tsx`

**Interfaces:**
- Consumes: `HelpLevel`, task Arabic, and the learner's current diacritic support level.
- Produces: `CoachPanel`, `DiacriticText`, and the final help level included with each attempt.

- [ ] **Step 1: Write failing behavior tests**

Create `src/features/study-room/coach-panel.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CoachPanel } from "./coach-panel";
import type { HelpLevel } from "@/domain/learning/types";

function Harness({ attempted = false }: { attempted?: boolean }) {
  const [level, setLevel] = useState<HelpLevel>(0);
  return <CoachPanel level={level} attempted={attempted} onAdvance={setLevel} />;
}

it("reveals help in order and blocks the full answer before an attempt", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByText("Replay audio")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByText("Show diacritics")).toBeVisible();
  for (let step = 2; step < 6; step += 1) fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByRole("button", { name: "Next hint" })).toBeDisabled();
});
```

Create `src/features/study-room/diacritic-text.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { DiacriticText } from "./diacritic-text";

const props = { vocalized: "مَكْتَبَة", ambiguous: "مَكْتبة", plain: "مكتبة" };

it.each([
  ["FULL", "مَكْتَبَة"], ["AMBIGUOUS", "مَكْتبة"], ["NONE", "مكتبة"],
] as const)("renders %s support", (level, expected) => {
  render(<DiacriticText {...props} level={level} />);
  expect(screen.getByText(expected)).toBeVisible();
});

it("lets keyboard and pointer users reveal on-tap diacritics", () => {
  render(<DiacriticText {...props} level="ON_TAP" />);
  fireEvent.click(screen.getByRole("button", { name: "Show diacritics" }));
  expect(screen.getByText("مَكْتَبَة")).toBeVisible();
});
```

- [ ] **Step 2: Run tests and verify both components are absent**

Run: `pnpm test src/features/study-room/coach-panel.test.tsx src/features/study-room/diacritic-text.test.tsx`
Expected: FAIL because both modules do not exist.

- [ ] **Step 3: Implement the help-state machine**

Create `src/features/study-room/coach-panel.tsx`:

```tsx
"use client";

import type { HelpLevel } from "@/domain/learning/types";

export const HELP_STEPS = [
  "Try without help",
  "Replay audio",
  "Show diacritics",
  "Highlight the relevant segment",
  "Reveal root or pattern",
  "Show an Arabic hint",
  "Show a constrained English hint",
  "Reveal the answer and retry",
] as const;

export function CoachPanel({ level, attempted, onAdvance }: {
  level: HelpLevel;
  attempted: boolean;
  onAdvance: (level: HelpLevel) => void;
}) {
  const blocked = level >= 7 || (level === 6 && !attempted);
  return <aside aria-label="Learning coach">
    <p aria-live="polite">{HELP_STEPS[level]}</p>
    <button type="button" disabled={blocked} onClick={() => onAdvance(Math.min(7, level + 1) as HelpLevel)}>Next hint</button>
  </aside>;
}
```

- [ ] **Step 4: Implement progressive diacritic rendering**

Create `src/features/study-room/diacritic-text.tsx`:

```tsx
"use client";

import { useState } from "react";

type DiacriticLevel = "FULL" | "AMBIGUOUS" | "ON_TAP" | "NONE";

export function DiacriticText({ vocalized, ambiguous, plain, level }: {
  vocalized: string;
  ambiguous: string;
  plain: string;
  level: DiacriticLevel;
}) {
  const [revealed, setRevealed] = useState(false);
  const text = level === "FULL" || (level === "ON_TAP" && revealed)
    ? vocalized
    : level === "AMBIGUOUS" ? ambiguous : plain;
  return <div>
    <p lang="ar" dir="rtl">{text}</p>
    {level === "ON_TAP" && !revealed ? <button type="button" onClick={() => setRevealed(true)}>Show diacritics</button> : null}
  </div>;
}
```

Render only one readable Arabic string at a time. The `Show diacritics` button must have a CSS minimum height of 44px.

- [ ] **Step 5: Connect attempt metadata**

Update `TaskCard` to accept this exact submission contract:

```ts
export interface TaskSubmission {
  answer: string;
  helpLevel: HelpLevel;
  attempted: boolean;
  startedAt: string;
  confidence: 1 | 2 | 3 | 4 | 5;
}
```

Keep `helpLevel` and `confidence` in `TaskCard` state, set `attempted` on the first submission, and pass attempt state to `CoachPanel`. Render confidence as a five-choice fieldset labeled “How sure were you?” When help reaches level 7, retain the learner's answer, show `expectedAnswer`, label the button “Try corrected answer,” and do not call the attempt API until that retry is submitted.

- [ ] **Step 6: Verify help and Arabic support**

Run: `pnpm test src/features/study-room && pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: all focused and full checks exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/study-room
git commit -m "feat: add progressive Arabic help"
```

---

### Task 10: Complete attempt recording, session closure, progress summary, and E2E verification

**Files:**
- Modify: `src/features/study-room/use-study-session.ts`
- Modify: `src/features/study-room/task-card.tsx`
- Modify: `src/features/study-room/study-room.tsx`
- Create: `src/features/study-room/progress-summary.tsx`
- Create: `src/features/study-room/progress-summary.test.tsx`
- Create: `tests/e2e/study-room.spec.ts`
- Create: `tests/e2e/global-setup.ts`
- Modify: `playwright.config.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: attempt API, returned `MasterySnapshot`, and all six planned tasks.
- Produces: complete session progression, ability-specific summary, desktop/mobile E2E evidence, and local run instructions.

- [ ] **Step 1: Write the failing progress-language test**

Create `src/features/study-room/progress-summary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { ProgressSummary } from "./progress-summary";

it("describes abilities separately without a fluency percentage", () => {
  render(<ProgressSummary counts={{ READING: 8, LISTENING: 5, WRITING: 3, SPEAKING: 2 }} />);
  expect(screen.getByText("You can read 8 items, understand 5 in listening, write 3, and speak 2.")).toBeVisible();
  expect(screen.queryByText(/% fluent/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify the summary is absent**

Run: `pnpm test src/features/study-room/progress-summary.test.tsx`
Expected: FAIL because `progress-summary.tsx` does not exist.

- [ ] **Step 3: Implement explicit progress language**

Create `src/features/study-room/progress-summary.tsx`:

```tsx
import type { Ability } from "@/domain/learning/types";

export function ProgressSummary({ counts, corrections = [] }: {
  counts: Record<Ability, number>;
  corrections?: string[];
}) {
  return <section aria-labelledby="progress-title">
    <h1 id="progress-title">Session complete</h1>
    <p>You can read {counts.READING} items, understand {counts.LISTENING} in listening, write {counts.WRITING}, and speak {counts.SPEAKING}.</p>
    {corrections.length > 0 ? <div><h2>Keep working on</h2><ul>{corrections.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
  </section>;
}
```

- [ ] **Step 4: Record each attempt before advancing**

Add this normalization and evidence builder to `src/features/study-room/use-study-session.ts`:

```ts
import type { Ability, EvidenceEvent, SessionTask } from "@/domain/learning/types";
import type { TaskSubmission } from "./task-card";

const abilityForStage: Partial<Record<SessionTask["stage"], Ability>> = {
  RETRIEVAL: "WRITING", NEW_CONCEPT: "WRITING", INPUT: "READING", OUTPUT: "WRITING",
};

function normalizeArabic(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim();
}

function buildEvidence(task: SessionTask, submission: TaskSubmission, learnerId: string): EvidenceEvent | null {
  const atomId = task.atomIds[0];
  const ability = abilityForStage[task.stage];
  if (!atomId || !ability || task.expectedAnswer === null) return null;
  return {
    id: crypto.randomUUID(), learnerId, atomId, ability,
    occurredAt: new Date().toISOString(),
    correct: normalizeArabic(submission.answer) === normalizeArabic(task.expectedAnswer),
    responseMode: "TYPE", helpLevel: submission.helpLevel,
    latencyMs: Date.now() - Date.parse(submission.startedAt), confidence: submission.confidence,
    novelContext: task.stage === "OUTPUT", analysisConfidence: null,
  };
}
```

Replace the temporary local `advance()` with this API-backed function and add `counts` state initialized to four zeroes:

```ts
const [counts, setCounts] = useState<Record<Ability, number>>({ READING: 0, LISTENING: 0, WRITING: 0, SPEAKING: 0 });
const [submitting, setSubmitting] = useState(false);

const submitAttempt = useCallback(async (submission: TaskSubmission) => {
  if (!view || !currentTask) return;
  setSubmitting(true);
  setError(null);
  try {
    const nextTaskIndex = view.currentTaskIndex + 1;
    const response = await fetch(`/api/study/sessions/${view.plan.id}/attempts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taskId: currentTask.id,
        nextTaskIndex,
        event: buildEvidence(currentTask, submission, view.plan.learnerId),
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to save this attempt");
    setCounts(body.counts);
    setView({ ...view, currentTaskIndex: nextTaskIndex, status: nextTaskIndex >= view.plan.tasks.length ? "COMPLETE" : "ACTIVE" });
  } catch (reason) {
    setError(reason instanceof Error ? reason.message : "Unable to save this attempt");
  } finally {
    setSubmitting(false);
  }
}, [currentTask, view]);
```

Return `submitAttempt`, `submitting`, and `counts` from the hook. Update `StudyRoom` to pass `submitAttempt` to `TaskCard`, keep the learner's answer on screen when `error` is set, and render `<ProgressSummary counts={counts} />` when `currentTaskIndex === plan.tasks.length`. Do not infer unreturned mastery values.

- [ ] **Step 5: Write the desktop and mobile E2E journey**

Create `tests/e2e/study-room.spec.ts` with two projects:

```ts
import { expect, test } from "@playwright/test";

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 375, height: 812 }]) {
  test(`${viewport.name} learner completes and resumes a study session`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/study");
    await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();
    for (const stage of ["Arrival", "Retrieval", "New concept", "Input", "Output", "Close"]) {
      await expect(page.getByRole("heading", { name: stage })).toBeVisible();
      await page.getByRole("textbox").fill(stage === "Close" ? "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ" : "ب");
      await page.getByRole("button", { name: /submit|continue/i }).click();
    }
    await expect(page.getByText(/You can read/)).toBeVisible();
    expect(await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth)).toBe(true);
  });
}
```

Create `tests/e2e/global-setup.ts`:

```ts
import { db } from "../../src/server/db";

export default async function globalSetup() {
  if (process.env.NODE_ENV === "production") throw new Error("E2E reset cannot run in production");
  const learnerId = process.env.DEMO_LEARNER_ID ?? "00000000-0000-4000-8000-000000000001";
  await db.evidenceEvent.deleteMany({ where: { learnerId } });
  await db.studySession.deleteMany({ where: { learnerId } });
  await db.masterySnapshot.deleteMany({ where: { learnerId } });
  await db.learner.upsert({ where: { id: learnerId }, update: {}, create: { id: learnerId } });
  await db.$disconnect();
}
```

Add `globalSetup: "./tests/e2e/global-setup.ts"` to `playwright.config.ts`. Keep the existing `pnpm dev` web server, `http://127.0.0.1:3000` base URL, and reuse behavior outside CI.

- [ ] **Step 6: Document the local vertical slice**

Create `README.md`:

```markdown
# Nawa

Nawa is a serious Modern Standard Arabic learning notebook. This repository currently implements the foundation and adaptive Study Room vertical slice.

## Prerequisites

- Node.js 24 LTS
- pnpm 10
- Docker with Compose

## Local setup

1. `cp .env.example .env`
2. `docker compose up -d db`
3. `pnpm install`
4. `pnpm db:generate`
5. `pnpm prisma migrate dev`
6. `pnpm db:seed`
7. `pnpm dev`

Open <http://127.0.0.1:3000/study>.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e`

## Program boundary

Authentication and offline synchronization are Plan 2. Notebook, Reader, Language Ink, and imports are Plan 3. Speech, handwriting, the bounded tutor, and Arabic validation are Plan 4. See `docs/superpowers/plans/2026-07-11-nawa-v1-program-roadmap.md`.
```

- [ ] **Step 7: Run the complete verification gate**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Expected: unit/integration tests report zero failures, typecheck and lint exit 0, the production build succeeds, and both desktop and mobile E2E journeys pass.

- [ ] **Step 8: Review the final diff against the specification**

Run: `git diff --check && git status --short`
Expected: no whitespace errors and only files listed in Tasks 1–10 are modified or untracked.

- [ ] **Step 9: Commit**

```bash
git add README.md src/features/study-room tests/e2e playwright.config.ts
git commit -m "feat: complete adaptive Study Room slice"
```

---

## Plan 1 completion gate

Plan 1 is complete only when all of the following are true:

- The focused tests for every task were observed failing before implementation and passing afterward.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e` exit 0 in a fresh verification run.
- A 30-, 45-, and 60-minute plan contains all six stages and totals the requested duration.
- Reload resumes the active session instead of creating a duplicate.
- Every accepted attempt produces one immutable evidence row and one derived mastery update.
- Reading, listening, writing, and speaking remain separately visible.
- The help ladder cannot reveal a complete answer before an attempt.
- Full, ambiguous, on-tap, and absent diacritic modes remain keyboard accessible.
- The 375px E2E run has no horizontal overflow.
- The development-only learner boundary fails closed when disabled.
- The repository contains no account, AI tutor, speech provider, handwriting recognition, or personal-import implementation; those boundaries belong to Plans 2–4.
