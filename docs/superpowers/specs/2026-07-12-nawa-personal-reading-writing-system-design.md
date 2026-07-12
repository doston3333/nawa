# Nawa Personal Reading and Writing System Design

**Status:** Approved design direction  
**Date:** 2026-07-12  
**Delivery:** Local machine first; single VPS later  
**Audience:** Two or three known users  

## 1. Product boundary

Nawa is a private Modern Standard Arabic reading and writing system. It combines the existing structured course with personal notebooks, imported reading material, contextual Arabic analysis, and delayed reading and writing assessments.

The system is intentionally optimized for two or three known users. Each person has a separate named profile, separate progress, separate notebooks, and separate imported material. Selecting a profile is sufficient; passwords, email login, account recovery, billing, organizations, and public registration are out of scope.

Nawa tracks only two learning abilities:

- **Reading:** recognizing and interpreting Arabic in familiar and unfamiliar written contexts.
- **Writing:** producing Arabic without copying, including spelling, sentence construction, and short composition.

Listening, speaking, audio playback, pronunciation analysis, handwriting recognition, and general-purpose tutoring are not active product goals.

## 2. Goals

- Make lessons, notebooks, and previously opened reading material usable offline.
- Synchronize a profile's progress and writing across multiple devices after reconnection.
- Preserve every imported source and every user-authored revision without silent overwrites.
- Accept pasted text, PDFs, images, and scans.
- Provide a focused Reader for Arabic and bilingual material.
- Turn selected personal content into controlled reading and writing practice.
- Enrich Language Ink with contextual, traceable Arabic analysis.
- Provide a small curriculum editor appropriate for personal use.
- Schedule 7-, 30-, and 90-day reading and writing assessments.
- Run locally with one command and remain straightforward to move to one VPS.

## 3. Non-goals

- Public signup or untrusted multi-tenant hosting
- Passwords, password reset, OAuth, or email delivery
- Real-time collaborative editing
- Speech, listening assessment, pronunciation, audio, or voice recording
- Handwriting capture or recognition
- Open-ended AI chat or a general-purpose tutor
- Social feeds, streaks, XP, leaderboards, or payments
- Redis, distributed rate limiting, multi-region deployment, or horizontal scaling
- A publishing-grade curriculum content management system

## 4. Information architecture

Nawa has five destinations.

### Today

Today presents at most three useful continuations:

1. Continue the next structured lesson.
2. Resume the most recently read document.
3. Complete a due reading or writing assessment.

### Learn

Learn retains the existing eight-unit MSA course path. Exercises and progress language are revised to use only reading and writing evidence. Unit checkpoints report the two abilities separately.

### Notebook

Notebook provides a mixed-direction editor for Arabic, English, and bilingual notes. Notes autosave locally, remain editable offline, keep revision history, and allow selected text to be sent to the Reader or saved for future practice.

### Reader

Reader displays pasted text, extracted documents, and user-corrected versions. It provides:

- Correct bidirectional text behavior
- Adjustable Arabic type size and line spacing
- Saved reading position
- Progressive diacritics when available
- Selection-based Language Ink
- A visible distinction between original, extracted, edited, translated, and adapted content

### Library

Library lists notebooks and imported documents. Users can search, filter, rename, archive, export, reopen, or inspect processing status. Original source files remain available.

## 5. Profile model

A `Profile` is a named local identity with a stable UUID. Profile selection sets an httpOnly, same-site cookie; the cookie is marked `Secure` when Nawa is served over HTTPS and remains usable on local HTTP during development. Every server record and every IndexedDB record includes `profileId`.

Profile names are not credentials. The profile picker must state that anyone who can access the private Nawa installation can select any profile. The later VPS deployment is expected to be protected at the network or reverse-proxy layer if exposed beyond a trusted network.

Existing anonymous learners are migrated to profiles. A migration creates one named default profile for the current learner and reassigns existing sessions, evidence, mastery, and lesson progress without changing their identifiers.

## 6. Canonical storage and local storage

PostgreSQL is the canonical shared store. Each browser also maintains a profile-scoped IndexedDB database containing:

- Profile metadata needed by the shell
- Active lesson/session state
- Mastery and lesson progress projections
- Notebooks and notebook revisions
- Document metadata and processed text revisions
- Reading positions
- Saved personal practice items
- Due assessment summaries
- Pending mutation outbox
- Synchronization cursor and acknowledgement state

The browser does not store API keys. External AI calls run only on the server.

Uploaded originals are stored outside PostgreSQL in a persistent file directory for local and VPS deployments. PostgreSQL stores ownership, content hash, MIME type, byte length, processing state, and storage key. The storage interface must allow a later object-storage adapter without changing domain repositories.

## 7. Synchronization protocol

Every client mutation has:

- Stable UUID mutation ID
- Profile ID
- Device ID
- Entity type and entity ID
- Operation type
- Base revision
- Client timestamp
- Payload

The browser applies the mutation to IndexedDB first, appends it to the outbox, and updates the interface optimistically. When online, the client submits mutations in order to an idempotent sync endpoint.

The server records acknowledged mutation IDs. Replaying an acknowledged mutation returns the prior result and never duplicates evidence, revisions, or deletions.

The response returns:

- Per-mutation result
- Server revision or conflict record
- Server change cursor
- Changes since the client's previous cursor

### Conflict policy

Progress events and immutable evidence merge by unique identifier.

Reading positions use last accepted server revision and retain the newer device timestamp for display progress.

Notebook and extracted-text edits use optimistic concurrency. When `baseRevision` is stale and both sides changed, the server creates a conflict record containing both complete versions. Neither version is discarded. The client shows a recovery screen where the user can choose one version or create a merged revision.

Deletes create tombstones. Tombstones synchronize like other changes and prevent another device from resurrecting deleted content.

## 8. Offline PWA behavior

A service worker precaches the versioned application shell and runtime-caches safe static assets. It also caches previously opened Reader resources and curriculum payloads.

Offline guarantees are limited and explicit:

- Previously loaded shell routes open offline.
- Existing notebooks can be created and edited offline.
- Previously synchronized documents can be read offline.
- Lesson attempts and reading positions can be recorded offline.
- Mutations survive reload and browser restart.
- Synchronization resumes automatically when connectivity returns.

The first visit, new file import, AI analysis, translation, OCR, and uncached documents require a connection. The UI must distinguish `saved locally`, `waiting to sync`, `synced`, `conflict`, and `internet required` states.

## 9. Notebook data model

A notebook consists of:

- Stable notebook record: owner, title, language mode, archive state, timestamps
- Immutable notebook revisions: content, format, parent revision, authoring device, creation time
- Current revision pointer
- Optional conflict pointer

The first editor format is structured plain text with paragraph direction metadata, not a general rich-text document model. This supports reliable Arabic/English selection, export, revision comparison, and offline merging without introducing a large editor framework.

Exports include Markdown, UTF-8 plain text, and JSON metadata.

## 10. Import and Reader pipeline

Supported inputs are:

- Pasted Arabic, English, or bilingual text
- PDF
- PNG, JPEG, or WebP image
- Camera or document scan saved in one of the supported image formats

Import processing follows these stages:

1. Compute a content hash and create a local import record.
2. Store or queue the original file upload.
3. Extract embedded PDF text locally on the server when available.
4. Use the external analysis adapter for scans, images, difficult PDFs, translation, or structured Arabic analysis.
5. Validate the provider response against a versioned schema.
6. Store extracted or generated content as a derived revision with provenance.
7. Let the user correct extracted text before promotion into practice.

Original sources are immutable. Derived records store provider, model, prompt/schema version, timestamp, confidence, and relationship to the source revision.

Interrupted or duplicate uploads are safe because the source content hash and mutation ID are idempotency keys. Large-file limits and storage quota errors are shown before processing where possible.

## 11. External analysis adapter

Nawa defines a provider-neutral `ContentAnalysisProvider` server interface with operations for:

- Document transcription
- Image OCR
- Translation
- Contextual Arabic word or phrase analysis
- Level-appropriate adaptation

The first adapter uses the Gemini API free tier. Provider selection and model names are configuration, not domain constants. Free-tier exhaustion, provider downtime, or missing credentials must not block ordinary reading, writing, or synchronization.

Provider output is untrusted. Each response is parsed through a strict versioned schema. Unsupported register, low-confidence morphology, or malformed output is labeled or withheld. Provider output cannot directly modify mastery, trusted curriculum atoms, or original user content.

## 12. Contextual Language Ink

Language Ink opens from selected Arabic text in lessons, notebooks, and Reader content. It first resolves local trusted data and then optionally requests contextual online analysis.

The panel can show:

- Selected surface form
- Vocalized form
- Meaning in the current sentence
- Root and relevant pattern when confidence is sufficient
- Part of speech and inflection
- Short grammar note
- Related known curriculum atoms
- Prior encounters in personal and curriculum content
- Provenance and uncertainty label
- `Save for practice` action

Saved items do not become mastered automatically. They enter a personal practice queue and create reading or writing evidence only after an actual attempt.

Audio and pronunciation controls are not included.

## 13. Personal curriculum editor

The curriculum editor is available from a low-prominence personal administration route. It supports:

- Create and edit reading/writing knowledge atoms
- Canonical and vocalized Arabic
- English gloss and accepted alternatives
- Root and pattern notes
- Prerequisite selection
- Lesson and unit placement
- Reading and writing assessment coverage
- Archive instead of destructive deletion when evidence references an atom

Validation rejects duplicate identifiers, missing prerequisites, cycles, empty accepted-answer sets, unsupported ability values, and released atoms without assessment coverage.

Generated suggestions are drafts. Only an explicit user action promotes a validated draft into the curriculum.

## 14. Reading and writing assessments

Nawa schedules delayed assessments at approximately 7, 30, and 90 days after qualifying retrieval or application evidence.

Reading assessments use unfamiliar sentences or short passages containing known atoms. Writing assessments require recall, sentence construction, or short composition without copying the target form.

Results remain separate:

- Reading items understood without reveal
- Writing items produced without reveal
- Hint dependence
- Recurring error categories
- Items due for repair

An assessment never reports a single fluency percentage. Missed assessments remain due but do not create failure evidence until the learner attempts them.

## 15. Error handling and recovery

- AI-required actions show `internet required` while offline.
- Failed AI jobs retain their source and may be retried safely.
- Schema-invalid provider responses are stored only in diagnostic logs, not user content.
- Uploads report queued, uploading, processing, ready, or failed states.
- Synchronization never clears an outbox entry before server acknowledgement.
- Conflicts preserve both full versions.
- Storage quota warnings include export and cleanup actions.
- A profile can export notebooks, documents, progress, evidence, and metadata as ZIP, Markdown, and JSON.
- Database backups and uploaded originals are included in the operational backup procedure.

## 16. Rate limiting and security boundary

The existing process-local rate limits remain as a basic accidental-abuse guard. Distributed rate limiting is unnecessary for one application process and two or three known users.

The application must still validate profile ownership on every server read and write. Profile selection without a password is a convenience boundary, not an authorization boundary against hostile users. VPS instructions must recommend a private network, VPN, or reverse-proxy access control before public exposure.

## 17. Local and VPS operations

Local operation uses Docker Compose with:

- Nawa application
- PostgreSQL
- Persistent upload volume
- Persistent database volume
- Health checks
- Backup command or scheduled backup container

The same stack is the reference VPS deployment. A reverse proxy terminates HTTPS and limits access. Deployment documentation covers initial setup, environment variables, migrations, backup, restore, update, and rollback.

No live public deployment is required during implementation. Deployment readiness is proven through a local production-mode container, health check, persistent restart, and backup/restore test.

## 18. Delivery milestones

Each milestone receives its own implementation plan, migration review, verification gate, and completion record. Later milestones may consume stable contracts from earlier milestones but must not be bundled into one unreviewable code change.

### Milestone 1: Profiles and synchronization foundation

- Named profile picker and migration from anonymous learner data
- Profile ownership across existing records
- IndexedDB database and outbox
- Idempotent sync API and change cursor
- Service worker and offline shell
- Cross-device lesson and reading/writing progress synchronization

### Milestone 2: Notebook, Library, and Reader

- Offline mixed-direction notebook editor
- Immutable revision history and conflict recovery
- Library navigation and archive/export flows
- Paste, PDF, image, and scan imports
- Original and derived content storage
- Reader typography and reading-position synchronization

### Milestone 3: Contextual learning

- Provider-neutral content analysis adapter and Gemini implementation
- Structured OCR, translation, and contextual analysis
- Contextual Language Ink
- Personal practice promotion
- Personal curriculum editor and validation
- Reading/writing-only mastery language and delayed assessments

### Milestone 4: Operations and documentation

- Local Docker Compose production stack
- Persistent uploads and automated backups
- Backup and restore verification
- VPS deployment guide
- Updated product specification and roadmap
- Plan 1 completion record based on verified repository state
- Removal of speech, listening, audio, handwriting, and general tutor commitments

## 19. Verification strategy

Unit tests cover:

- Outbox state transitions
- Idempotent mutation replay
- Revision and conflict rules
- Tombstones
- Import validation
- Provider schema parsing
- Curriculum graph validation
- Reading and writing mastery transitions
- Delayed assessment scheduling

Integration tests cover:

- Profile isolation
- Existing learner migration
- Sync cursor behavior
- Cross-device changes
- Upload idempotency
- Conflict preservation
- Export completeness
- Database backup and restore

Browser tests cover:

- Select a profile on two browser contexts
- Complete progress on one device and receive it on another
- Edit a notebook offline, reload, reconnect, and synchronize
- Create a deliberate two-device conflict and recover both versions
- Import pasted text, PDF, image, and scan fixtures
- Resume reading position on another device
- Use contextual Language Ink and save a practice item
- Complete due reading and writing assessments
- Operate primary flows at 375px and desktop widths with keyboard navigation

The full gate is `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, database migrations, Playwright, production container health, persistent restart, and backup/restore.

Offline support is not complete until a browser can disconnect, create or edit content, reload, reconnect, and synchronize without data loss or duplication.

## 20. Documentation corrections

The previous five-plan roadmap is superseded by this personal reading and writing scope. Documentation must:

- Mark the implemented foundation as complete based on fresh verification.
- Replace stale unchecked Plan 1 task boxes with a completion record or historical-plan label.
- Remove distributed infrastructure and public-scale assumptions.
- Remove speech, listening, audio, handwriting, and general tutor deliverables.
- Describe Notebook, Reader, imports, offline synchronization, Language Ink, curriculum editing, and delayed assessments using the milestones above.
- State clearly that deployment is local first and VPS later.

## 21. Acceptance criteria

The personal reading and writing system is complete when:

- Two or three named profiles remain isolated without passwords.
- The same profile synchronizes learning progress and notebook edits across devices.
- Previously opened lessons, notes, and documents remain usable offline.
- Offline mutations survive reload and synchronize once without duplication.
- Conflicting notebook edits preserve both versions.
- Paste, PDF, image, and scan imports preserve the original and produce editable extracted text.
- AI-dependent processing fails safely without blocking ordinary use.
- Language Ink provides contextual, provenance-labeled text analysis without audio.
- Personal content can enter reading or writing practice only through explicit user action.
- Curriculum validation prevents broken prerequisites and uncovered released atoms.
- Due 7-, 30-, and 90-day assessments report reading and writing separately.
- A local production stack survives restart with database and uploads intact.
- Backup and restore recreate profiles, learning data, notebooks, documents, and original files.
- The repository documentation accurately reflects the implemented scope and status.
