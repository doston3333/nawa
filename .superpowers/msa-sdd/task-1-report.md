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

## Review follow-up

- The active Learn route now projects `ACTIVE_COURSE` through `ACTIVE_UNITS`
  and `ACTIVE_LESSONS`. `buildLearnPathView`, lesson start/completion, the
  route page, and the lesson runner use those active projections. Legacy
  `LESSONS`/`UNITS` and `getLessonById` remain for historical progress and sync
  validation, so old IDs are not presented as the current course path.
- `LessonStep` is now a discriminated union. Teaching steps cannot carry an
  exercise/template, handwriting requires both an exercise and template, and
  all other interactive variants require an exercise. The compile-time contract
  test uses expected type errors to verify these constraints.
- Validation now checks strict unique unit/lesson ordering, policy-specific
  answer schemas, and that checkpoint assessment exercise IDs are unique and
  belong to their checkpoint lesson.

### Review red-green evidence

1. Red: focused catalog/unlock tests failed while the Learn path still began at
   `script-1`; `pnpm typecheck` also failed with unused `@ts-expect-error`
   directives because malformed handwriting/typing steps were accepted.
2. Green: focused catalog, type-contract, unlock, and isolation tests passed:
   4 files, 12 tests.
3. Final verification: `pnpm typecheck` passed and `pnpm test` passed:
49 files, 150 tests. Node emitted only the existing localStorage
experimental warning.

## Critical path-source follow-up

- `LESSONS`, `UNITS`, `getLessonById`, `orderedLessons`, and `nextLessonId`
  now project `ACTIVE_COURSE` directly. The first public path lesson is
  `rtl-baseline-lesson-1`; `script-1` is absent from the active projection.
- The previous course rows are retained as explicitly named
  `HISTORICAL_LESSONS`/`HISTORICAL_UNITS` and are used only by sync validation,
  so existing persisted progress remains historical and does not re-enter the
  active Learn route.
- Red: the path regression test failed with `script-1` before the public
  exports were switched. Green: focused path, tips, lesson-plan, and unlock
  tests passed (4 files, 13 tests); `pnpm typecheck` and the full suite then
  passed (49 files, 150 tests).
