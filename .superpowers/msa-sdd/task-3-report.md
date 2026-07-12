# Task 3 report: deterministic interactive lesson renderer

## Delivered

- Replaced the active-course lesson surface with an exhaustive typed `LessonStep` renderer while retaining `TaskCard` for legacy/non-catalog sessions.
- Added deterministic local evaluation for `EXACT`, `NORMALIZED_ARABIC`, `ORDERED_TOKENS`, and `ANY_OF` accepted-answer policies.
- Added post-attempt feedback with state, reason, rule, and a contrasting instruction; scored checks omit hints.
- Sent course-version, skill, exercise-type, timing, hint-use, and error-classification metadata through the existing attempt contract.
- Kept persisted session index/offline queue behavior and added a final scored-check mastery summary.
- Added keyboard-native controls, focus-compatible buttons/inputs, RTL Arabic content, and a handwriting-coming-soon surface.

## Verification

- Focused: `pnpm test src/features/learn/lesson-evaluator.test.ts src/features/learn/interactive-lesson-step.test.tsx src/features/learn/use-lesson-session.test.tsx` — 20 tests passed.
- Full: `pnpm test` — 52 files / 174 tests passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed.

## Scope preserved

- Preserved existing `next-env.d.ts` modification and untracked scratch/plan files; they are not part of this task commit.
