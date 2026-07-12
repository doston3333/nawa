# Task 6 report: offline app shell

Implemented and verified the service-worker shell boundary.

## Changes

- Added `public/sw.js` with versioned `nawa-shell-v1` install/activate lifecycle.
- Precached `/`, `/learn`, `/study`, `/manifest.webmanifest`, and both icon assets.
- Added cache-first handling for same-origin shell/static assets.
- Added network-first handling for same-origin API GETs, with a 503 offline fallback.
- Mutation requests are returned untouched and are never intercepted or cached.
- API responses are not persisted in the shared service-worker cache because they are profile-scoped; profile data continues through the IndexedDB/sync boundary.
- Added `src/app/sw-register.tsx`, gated to production or `NEXT_PUBLIC_ENABLE_SW=true`, using `{ updateViaCache: "none" }`.
- Registered the component in `src/app/layout.tsx`.
- Added `/sw.js` `Content-Type` and `Cache-Control: no-cache` headers in `next.config.ts`.
- Added manifest `id`, `scope`, and `prefer_related_applications: false` metadata without claiming offline AI/import support.
- Added registration tests for enabled and unavailable-browser cases.

## Verification

- `pnpm vitest run src/app/sw.test.tsx src/app/page.test.tsx` — 2 files, 3 tests passed
- `pnpm test` — 44 files, 118 tests passed
- `pnpm typecheck` — passed
- `pnpm lint` — passed
- `pnpm build` — passed
- `node --check public/sw.js` — passed
- `git diff --check` — passed
