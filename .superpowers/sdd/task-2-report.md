# Task 2 report: profile selection and cookie boundary

## Status

Implemented and committed as `d2fdc34 feat: add passwordless profile selection`; strict compatibility and route-test review fixes committed as `af0ff89 fix: make public learner compatibility strict`.

## Delivered

- Added strict `resolveProfileId()` and `selectProfile()` helpers in `src/server/profile.ts`.
- Added named `ProfileSummary` list/create helpers with trimmed profile names.
- Added `GET /api/profiles` and validated `POST /api/profiles` (blank and >80-character names are rejected).
- Added validated `POST /api/profile/select` with the 400-day httpOnly `nawa_profile_id` cookie (`sameSite=lax`, root path, conditional secure flag).
- Added the accessible client profile picker with keyboard-native buttons/forms, profile creation, server selection, navigation to `/`, refresh, and an explicit no-password privacy note.
- Added `/profiles` as a dynamic server route.
- Gated `/learn` and `/study` with a redirect to `/profiles` when no known profile is selected.
- Preserved the compatibility boundary with `resolvePublicLearnerId` as a strict alias to `resolveProfileId`; any random-profile behavior is isolated to the explicitly named legacy `resolveLegacyPublicDemoProfileId` helper.
- Added profile picker tests for rendering/privacy, selection, and create-then-select behavior.

## Verification

Commands run from `/Users/doston/Downloads/nawa`:

```text
$ pnpm vitest run src/features/profile/profile-picker.test.tsx src/server/profile.test.ts src/server/public-learner.test.ts src/app/api/health/route.test.ts
Test Files  4 passed (4)
Tests       13 passed (13)

$ pnpm typecheck
tsc --noEmit (passed; no output)

$ pnpm lint
eslint . (passed; no output)

$ pnpm vitest run
Test Files  24 passed (24)
Tests       56 passed (56)

$ pnpm build
Next.js production build passed; routes compiled, including dynamic `/profiles`, `/learn`, and `/study`.
```

## Concerns / follow-up

- All active learning/study API routes now import `resolveProfileId`; `src/server/demo-learner.ts` remains a deprecated strict alias for older imports and cannot create a profile implicitly.
- The root landing page remains a public informational shell and exposes a “Switch profile” link; `/learn` and `/study` are the enforced profile-gated learning surfaces.
- The implementation intentionally does not add authentication or a distributed session/rate-limit service, matching the 2–3-person private-use scope.

## Review fixes (2026-07-12)

The follow-up review findings are resolved in the working tree:

- Migrated `/api/learn/path`, `/api/learn/lessons/[lessonId]/start`, `/api/study/sessions`, `/api/study/sessions/[sessionId]/attempts`, and `/api/study/reset` to strict `resolveProfileId()`.
- Learning APIs return `400 PROFILE_SELECTION_REQUIRED` for missing, stale, or unknown profile selection instead of creating a random profile. Database and repository failures remain `503`.
- Reset only swallows the typed selection-required error because reset is an explicit user action; database failures are still surfaced as `503`. New reset profiles use the same cookie helper and flags as normal profile selection.
- `createProfile()` now owns the 80-character maximum validation; the profile route preserves `400` for validation and returns `503` for storage failures.
- Profile selection now distinguishes unknown profile (`400`) from persistence failure (`503`). Profile listing also returns `503` on storage failure.
- Added regression tests for API `201`/`400` validation, profile cookie flags and 400-day max age, keyboard Enter activation, strict no-cookie/unknown-cookie route behavior, and database `5xx` responses.
- Added dedicated `/api/study/reset` and `/api/learn/lessons/[lessonId]/start` tests for selection-required and database `5xx` behavior.
- Updated `src/server/public-learner.test.ts` to verify the strict compatibility alias separately from the explicitly named legacy demo helper.

## Review-fix verification (exact outputs)

```text
$ pnpm vitest run src/server/public-learner.test.ts src/app/api/study/reset/route.test.ts src/app/api/learn/lessons/[lessonId]/start/route.test.ts
Test Files  3 passed (3)
Tests       9 passed (9)

$ pnpm test
Test Files  30 passed (30)
Tests       74 passed (74)

$ pnpm typecheck
tsc --noEmit (passed; no output)

$ pnpm lint
eslint . (passed; no output)

$ pnpm build
Next.js 16.2.10 production build passed; all app/API routes compiled.

$ git diff --check
(no output; exit 0)
```
