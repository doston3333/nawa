# Nawa delivery roadmap

> **Scope amendment (2026-07-12):** The earlier five-plan roadmap below is superseded as a product roadmap. It remains in git history as a historical planning artifact. Current work follows the personal reading/writing design and the milestone plan linked below.

**Current specification:** `docs/superpowers/specs/2026-07-12-nawa-personal-reading-writing-system-design.md`

**Current implementation plan:** `docs/superpowers/plans/2026-07-12-nawa-profiles-offline-sync.md`

**Audience:** two or three trusted personal users, with separate named passwordless profiles, local-first use, and a later single-VPS deployment.

## Delivered foundation

The original responsive Study Room, beginner MSA curriculum, reading/writing lesson path, PostgreSQL persistence, named profiles, profile ownership, IndexedDB outbox, idempotent sync API, service worker shell caching, and visible sync status are implemented and verified on the current branch. The original Plan 1 checkboxes are retained only as historical implementation notes.

## Current milestones

### Milestone 1 — Profiles and synchronization foundation

Status: implemented and verified.

- Two or three named profiles remain isolated without passwords.
- Previously opened learning shells and lesson state work offline.
- Offline mutations survive reload and synchronize exactly once after reconnecting.
- Cross-device progress uses a stable device ID, mutation ledger, and change cursor.
- Local Docker Compose, PostgreSQL persistence, health checks, and backup/restore scripts are the operational baseline.

### Milestone 2 — Notebook, Library, Reader, and imports

Status: next implementation plan.

- Offline mixed-direction notebook editor with revisions and conflict recovery.
- Library navigation, archive, export, and profile-scoped search.
- Paste, PDF, image, and scan imports that preserve immutable originals.
- Reader typography and synchronized reading positions.
- AI/OCR processing is queued or online-only and never replaces source content.

### Milestone 3 — Contextual reading and writing support

Status: planned after Milestone 2.

- Provider-neutral online adapter (Gemini may be the first provider) for OCR, translation, and contextual Arabic analysis.
- Provenance-labeled Language Ink with sentence context, root/pattern where reliable, and personal practice promotion.
- Lightweight personal curriculum editor and validation.
- Delayed 7-, 30-, and 90-day assessments reported separately for reading and writing.

### Milestone 4 — Operations and documentation

Status: in progress with this runbook update.

- Local production Compose stack with persistent PostgreSQL and `.data` storage.
- Verified backup and restore commands for the database dump and uploaded originals.
- Single-VPS deployment, update, rollback, and private-network guidance.
- Documentation corrected to describe the personal reading/writing boundary.

## Removed scope

The following are explicitly removed from this product roadmap: speech analysis, pronunciation coaching, listening assessment, audio features, handwriting analysis, a generalized AI tutor, public-scale accounts, gamification/social features, distributed rate limiting, and public-demo deployment assumptions. Process-local rate limiting remains only as a small accidental-abuse guard for one private process.

## Invariants

- Every persistent record is owned by a named profile.
- Original imported content is immutable; derived text and AI output remain separate and provenance-labeled.
- AI services cannot write mastery state or trusted curriculum facts directly.
- Reading and writing evidence remain separate; no aggregate fluency score is reported.
- Offline mutations are retained until server acknowledgement and are idempotent on replay.
- Arabic text preserves bidirectional behavior and connected forms.
- The app remains private-network software unless an operator adds explicit reverse-proxy access control.
