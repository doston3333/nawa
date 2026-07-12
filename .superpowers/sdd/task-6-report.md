# Task 6 report: offline app shell

Implemented and verified the service-worker shell boundary.

## Changes

- Added `public/sw.js` with versioned `nawa-shell-v2` install/activate lifecycle. The v2
  name is an intentional security bump from the original v1 plan sketch after tightening
  the profile/privacy cache boundary.
- Precached only public `/`, `/manifest.webmanifest`, and both icon assets. The profile
  picker is not precached.
- Precache fetches require a successful, non-redirected `200` response. Redirects are
  skipped (never stored under the requested route), while fetch failures reject install
  so the browser can retry rather than activating an empty shell.
- Added cache-first handling for same-origin public shell/static assets plus the generic
  `/learn` and `/study` route shells after a selected profile loads them successfully
  online. Only non-redirected `200` responses are retained, so profile-picker redirects
  and other profile responses never enter Cache Storage.
- Added network-only handling for same-origin API GETs, with a 503 offline fallback. API
  payloads remain profile-scoped IndexedDB/network-only rather than shared service-worker
  cache entries.
- Mutation requests are returned untouched and are never intercepted or cached.
- API responses are not persisted in the shared service-worker cache because they are profile-scoped; profile data continues through the IndexedDB/sync boundary.
- Added `src/app/sw-register.tsx`, gated to production or `NEXT_PUBLIC_ENABLE_SW=true`, using `{ updateViaCache: "none" }`.
- Registered the component in `src/app/layout.tsx`.
- Added `/sw.js` `Content-Type` and `Cache-Control: no-cache` headers in `next.config.ts`.
- Added manifest `id`, `scope`, and `prefer_related_applications: false` metadata without claiming offline AI/import support.
- Added registration tests for enabled, disabled, and unavailable-browser cases.
- Added focused service-worker runtime tests covering precache filtering, redirect safety,
  install failure policy, old-cache deletion, cache-first static GETs, runtime caching for
  `/learn` and `/study`, profile-picker/redirect exclusion, network fallback, mutation
  bypass, and the profile-API no-cache boundary.

## Verification

- `pnpm vitest run src/app/sw-runtime.test.ts src/app/sw.test.tsx` — 2 files, 11 tests passed
- `pnpm test` — 45 files, 127 tests passed
- `pnpm typecheck` — passed
- `pnpm lint` — passed
- `pnpm build` — passed
- `node --check public/sw.js` — passed
- `git diff --check` — passed

Profile-specific API payloads remain network-only in the service worker until the
profile-scoped IndexedDB fallback is wired into each consuming screen. Session
hooks already use that fallback; the Learn path and Language Ink consumers remain
part of the cross-device/content follow-up milestone.
