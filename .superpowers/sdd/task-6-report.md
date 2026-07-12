# Task 6 report: offline app shell

Implemented and verified the service-worker shell boundary.

## Changes

- Added `public/sw.js` with versioned `nawa-shell-v2` install/activate lifecycle.
- Precached only public `/`, `/profiles`, `/manifest.webmanifest`, and both icon assets.
- Precache fetches require a successful, non-redirected `200` response. Redirects are
  skipped (never stored under the requested route), while fetch failures reject install
  so the browser can retry rather than activating an empty shell.
- Added cache-first handling for same-origin public shell/static assets (`/`, `/profiles`,
  Next static bundles, icons, and fonts only).
- Added network-only handling for same-origin API GETs, with a 503 offline fallback.
- Mutation requests are returned untouched and are never intercepted or cached.
- API responses are not persisted in the shared service-worker cache because they are profile-scoped; profile data continues through the IndexedDB/sync boundary.
- Added `src/app/sw-register.tsx`, gated to production or `NEXT_PUBLIC_ENABLE_SW=true`, using `{ updateViaCache: "none" }`.
- Registered the component in `src/app/layout.tsx`.
- Added `/sw.js` `Content-Type` and `Cache-Control: no-cache` headers in `next.config.ts`.
- Added manifest `id`, `scope`, and `prefer_related_applications: false` metadata without claiming offline AI/import support.
- Added registration tests for enabled, disabled, and unavailable-browser cases.
- Added focused service-worker runtime tests covering precache filtering, redirect safety,
  install failure policy, old-cache deletion, cache-first static GETs, network fallback,
  mutation bypass, and the profile-API no-cache boundary.

## Verification

- `pnpm vitest run src/app/sw-runtime.test.ts src/app/sw.test.tsx` — 2 files, 9 tests passed
- `pnpm test` — 45 files, 125 tests passed
- `pnpm typecheck` — passed
- `pnpm lint` — passed
- `pnpm build` — passed
- `node --check public/sw.js` — passed
- `git diff --check` — passed
