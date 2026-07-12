# Task 2 report: profile selection and cookie boundary

## Status

Implemented and committed as `d2fdc34 feat: add passwordless profile selection`.

## Delivered

- Added strict `resolveProfileId()` and `selectProfile()` helpers in `src/server/profile.ts`.
- Added named `ProfileSummary` list/create helpers with trimmed profile names.
- Added `GET /api/profiles` and validated `POST /api/profiles` (blank and >80-character names are rejected).
- Added validated `POST /api/profile/select` with the 400-day httpOnly `nawa_profile_id` cookie (`sameSite=lax`, root path, conditional secure flag).
- Added the accessible client profile picker with keyboard-native buttons/forms, profile creation, server selection, navigation to `/`, refresh, and an explicit no-password privacy note.
- Added `/profiles` as a dynamic server route.
- Gated `/learn` and `/study` with a redirect to `/profiles` when no known profile is selected.
- Preserved the existing public-learner compatibility boundary and its tests.
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

- Existing public API route callers still import `resolvePublicProfileId`; the strict resolver is used by the page gates. A later migration can move those callers to `resolveProfileId` once their route tests are updated.
- The root landing page remains a public informational shell and exposes a “Switch profile” link; `/learn` and `/study` are the enforced profile-gated learning surfaces.
- The implementation intentionally does not add authentication or a distributed session/rate-limit service, matching the 2–3-person private-use scope.
