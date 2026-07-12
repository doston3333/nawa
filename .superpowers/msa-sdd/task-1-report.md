# Task 1 — Versioned Pre-A1 course catalog

## Delivered

- Added stable, versioned course-domain types in `src/domain/course/types.ts`:
  `CourseLevel`, `CourseUnit`, `SkillDefinition`, `LessonDefinition`,
  `LessonStep`, `ExerciseDefinition`, `AssessmentDefinition`, and
  `HandwritingTemplate`.
- Added an immutable `ACTIVE_COURSE` (`pre-a1-v1`) in
  `src/domain/course/catalog.ts`. It contains the eight required ordered units,
  eight core lessons plus one checkpoint per unit, ten deterministic steps per
  lesson, and three no-hint scored tests at each lesson end.
- Added explicit typed variants for teaching, comparison, matching, sorting,
  word tiles, sentence ordering, completion, typing, correction,
  comprehension, composition, handwriting, and scored tests.
- Added `src/domain/course/validate.ts`, which rejects duplicate IDs, invalid
  prerequisite ordering/references, malformed answer schemas, non-Arabic MSA
  fields, missing unit checkpoint coverage, and invalid lesson step/scored-step
  counts.
- Exposed `ACTIVE_COURSE` from `src/domain/curriculum/path.ts` while restoring
  the legacy `LESSONS` and `UNITS` exports exactly, preserving old runner and
  persistence IDs, titles, atom mappings, tips, and migration behavior.

## Tests and verification

1. Red: `pnpm test src/domain/course/catalog.test.ts` failed because
   `./catalog` did not yet exist.
2. Focused: `pnpm test src/domain/course/catalog.test.ts src/domain/curriculum/path.test.ts src/domain/curriculum/tips.test.ts src/domain/lessons/build-lesson-plan.test.ts src/domain/lessons/unlock.test.ts`
   passed: 5 files, 15 tests.
3. `pnpm typecheck` passed.
4. Full: `pnpm test` passed: 48 files, 147 tests. The runner emitted Node's
   pre-existing localStorage experimental warning only.

## Concerns

None. The active versioned catalog is intentionally exposed independently of
the legacy path projection: replacing historical `LESSONS` rows would change
existing lesson IDs and migration/runner behavior, which this task forbids.
