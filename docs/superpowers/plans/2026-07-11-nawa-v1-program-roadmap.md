# Nawa V1 Program Roadmap

**Approved product specification:** `docs/superpowers/specs/2026-07-11-nawa-learning-system-design.md`
**Delivery surface:** Responsive web application and installable PWA
**Target learner:** Serious adult beginner studying MSA for 30–60 minutes per day

## Why V1 is divided into separate plans

The approved specification contains five systems with different failure modes and reviewer boundaries: the learning engine, account and offline synchronization, personal content, multimodal coaching, and curriculum operations. Combining them into one implementation plan would couple foundational learning logic to external AI and media services before the core can be tested.

Each plan below ends in independently runnable, reviewable software. Plans execute in order because later systems consume contracts established by earlier ones.

## Stable technology baseline

- Node.js 24 LTS
- pnpm 10
- Next.js 16.2 App Router
- React 19.2
- TypeScript 5.9 with strict mode
- Tailwind CSS 4 with project-owned design tokens
- PostgreSQL 17
- Prisma ORM 7 with `@prisma/adapter-pg`
- Zod 4 for boundary validation
- Vitest and Testing Library for unit and component tests
- Playwright for browser and accessibility flows
- Docker Compose for local PostgreSQL

## Plan 1: Foundation and adaptive Study Room vertical slice

**Detailed plan:** `docs/superpowers/plans/2026-07-11-nawa-foundation-study-room.md`

**Produces:**

- Responsive Next.js application shell and PWA manifest
- Seeded beginner curriculum graph
- Ability-specific mastery reducer
- Retrieval scheduler and deterministic session planner
- PostgreSQL persistence for evidence and sessions
- Runnable 30-, 45-, and 60-minute Study Room
- Help ladder, progressive diacritics, retrieval, input, output, and close stages
- Transparent progress summary
- Development-only seeded learner boundary

**Acceptance gate:** A browser test completes a seeded 30-minute session on desktop and mobile viewports, records immutable evidence, resumes after reload, and shows an ability-specific summary.

## Plan 2: Accounts, installability, offline sessions, and synchronization

**Consumes:** Plan 1 domain types, session repository, immutable evidence contract, and route schemas.

**Produces:**

- Passwordless account creation and secure httpOnly sessions
- Learner ownership on every persistent record
- Full web app manifest, icons, install prompts, and service worker
- IndexedDB cache for the active session and downloaded audio
- Idempotent outbox synchronization with stable event identifiers
- Cross-device pause and exact resume
- Data export and account deletion

**Acceptance gate:** A signed-in learner installs Nawa, completes attempts while offline, reconnects without duplicate evidence, and resumes the same session on a second browser.

## Plan 3: Notebook, Reader, Language Ink, and universal capture

**Consumes:** Plan 1 curriculum and learner-model contracts; Plan 2 ownership, storage, and synchronization contracts.

**Produces:**

- Bidirectional Arabic-aware note editor
- Immutable source revisions and linked adapted versions
- Reader for text, PDF, image OCR, and transcript imports
- Contextual Language Ink annotations
- Root, pattern, inflection, audio, and prior-encounter inspector
- Personal-content difficulty analysis
- Explicit promotion of selected personal content into practice
- Exportable Markdown, JSON, and original assets

**Acceptance gate:** A learner imports a document, reads an adapted copy without modifying the source, inspects an Arabic word, saves an appropriate phrase, and receives it in a later Study Room task.

## Plan 4: Speech, handwriting, bounded tutor, and validation pipeline

**Consumes:** Plan 1 evidence contract and help policy; Plan 3 personal-content provenance.

**Produces:**

- Audio recording, playback, and provider-neutral speech-analysis adapter
- Confidence-aware pronunciation evidence
- Arabic handwriting canvas and confirmation flow
- One-issue-at-a-time tutor policy
- Durable personal error patterns, contrast sets, repair scheduling, and retirement rules
- Generated-example provenance
- Arabic validation pipeline for script, morphology, grammar, diacritics, register, and dialect labeling
- Human editorial approval state for curriculum content

**Acceptance gate:** Low-confidence speech and handwriting results never reduce mastery; repeated mistakes become explicit repair sequences; validated examples can enter practice; unvalidated or dialect-mixed content cannot enter the curriculum graph.

## Plan 5: A1 curriculum operations and learning evaluation

**Consumes:** All prior product contracts.

**Produces:**

- Editorial tooling for approximately 500 high-utility words and phrases
- Prerequisite and accepted-answer validation
- Full A1 milestone definitions
- Weekly ability reports
- Delayed 7-, 30-, and 90-day assessments
- Transfer tasks with unfamiliar sentences and voices
- Analytics for hint and transliteration dependence
- Script-competency gates that progressively hide transliteration and allow temporary recovery when blocked
- Research export with privacy-preserving learner identifiers

**Acceptance gate:** Curriculum validation passes with no broken prerequisites, every released atom has assessment coverage, and a learner can complete a delayed assessment whose results remain separated by reading, listening, writing, and speaking.

## Cross-plan invariants

- Original notes and imported assets are never overwritten by generated adaptations.
- Only immutable evidence events change learner mastery.
- AI services cannot write mastery state or trusted curriculum facts directly.
- MSA and dialect content are explicitly labeled and never silently mixed.
- Speech or handwriting analysis below the configured confidence threshold cannot penalize mastery.
- Every generated explanation exposes provenance and uncertainty.
- Arabic text preserves correct bidirectional behavior and connected forms.
- Every primary interaction is keyboard accessible and usable at mobile width.
- Learner data remains exportable without proprietary serialization.

## Release sequence

1. Execute and review Plan 1.
2. Execute Plan 2 against Plan 1's frozen evidence and session interfaces.
3. Execute Plan 3 after ownership and offline storage contracts are stable.
4. Execute Plan 4 after personal-content provenance exists.
5. Execute Plan 5 after all evidence modalities are available.

No plan may weaken a cross-plan invariant without a written amendment to the approved product specification.
