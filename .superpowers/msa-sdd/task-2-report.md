# Task 2 — Course persistence, migration, and repository contracts

## Delivered

- Added additive Prisma migration `20260712211500_versioned_course_progress`.
  - Profile-owned `CourseEnrollment`, `CourseSkillProgress`, `CourseReview`, and `CourseAttempt` records.
  - Nullable versioned-course fields on `EvidenceEvent`, preserving all existing evidence rows.
  - Nullable course/version/lesson linkage on `StudySession`, preserving legacy sessions.
- Added the active-course repository contract in `src/server/repositories/course-repository.ts`:
  - `getActiveCoursePathContract()` exposes the active `pre-a1-v1` / version 1 Pre-A1 path.
  - Version and lesson/skill validation reject unknown catalog data.
  - Versioned starts create enrollment, enforce prerequisite skills, and resume the matching active session.
  - Due reviews project only the active course/version.
- Routed lesson starts through the versioned session contract while retaining legacy progress APIs for historical sync.
- Added `COURSE_ATTEMPT` sync mutation support. It validates profile/device ownership through the existing pipeline, validates catalog lesson/skill/exercise metadata, stores a single attempt using the stable mutation ID, updates versioned skill progress/review scheduling, and projects the stored attempt through `SyncChange`.
- Extended the evidence domain type and persistence mapping for optional curriculum/skill/exercise/timing/hint/error/handwriting metadata. No XP, Ink, quests, or handwriting UI were added.

## TDD evidence

1. Added `course-repository.test.ts`; first run failed as expected because `course-repository` did not yet exist.
2. Implemented the smallest catalog contract and verified that test passed.
3. Added the `COURSE_ATTEMPT` sync replay/projection test; the initial run was blocked by the local database lacking the additive migration, then `pnpm db:migrate:deploy` applied it and the test passed.

## Coverage added

- Unknown version, lesson, and skill rejection.
- Active Pre-A1 path contract.
- Prerequisite locking and unlocked versioned start.
- Matching versioned session resume.
- Legacy lesson progress retention without converting historical IDs into active-course completion.
- Profile isolation for course enrollment.
- Idempotent `COURSE_ATTEMPT` replay (one attempt only) and sync projection shape.

## Verification

- `pnpm db:generate` — passed.
- `pnpm db:migrate:deploy` — applied `20260712211500_versioned_course_progress` successfully.
- `pnpm test` — 50 files / 153 tests passed.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
