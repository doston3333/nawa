# CEO Review Summary — Nawa public Study Room

**Date:** 2026-07-11  
**Plan:** Ship public demo (Approach A) + SCOPE EXPANSION  
**User decisions:** Expansion opt-ins below; all architecture/detail questions → **CEO defaults** (`idc`)

## Mode & approach

- **Approach:** A — Demo on a URL (capability path; live deploy Expansion 1 OUT)
- **Mode:** SCOPE EXPANSION

## Expansion ledger

| # | Proposal | Decision |
|---|----------|----------|
| 1 | Live URL deploy | OUT |
| 2 | First-session depth (~30–50 atoms) | IN |
| 3 | Trust & abuse floor | IN |
| 4 | Return loop / waitlist | OUT |
| 5 | Language Ink lite | IN |
| 6 | Observability | IN |
| 7 | Speech tease | OUT |

## Accepted expanded scope (implement next)

1. **Curriculum depth** — grow beginner graph to ~30–50 high-utility MSA atoms; session tasks must vary (not letter-ba forever).
2. **Trust floor** — rate limits on study APIs; demo limits copy; reset session; honest cookie-loss messaging.
3. **Language Ink lite** — one tappable word → micro-panel (vocalized, gloss, root if known, prior encounter); no Notebook/import.
4. **Observability** — structured logs; `/api/health`; session_started / session_completed / error signals; short runbook.

## Explicitly OUT

- Live host deploy as a required deliverable (docs + Docker remain)
- Return loop / waitlist on complete
- Speech / pronunciation product surface
- Full Plan 2 accounts, offline, Plan 3 notebook, Plan 4 multimodal, Plan 5 A1 ops

## CEO defaults (user idc)

| Topic | Default |
|-------|---------|
| Identity vs Plan 2 | Cookie learner disposable; one plan note only; no IdentityProvider now |
| Rate limit placement | Shared helper used by all study routes + process-local memory; comment multi-node needs Redis |
| Rate limit numbers | 10 session starts / IP / hour; 120 attempts / learner / hour; 429 JSON |
| Cookie secure flag | Secure when `NEXT_PUBLIC_SITE_URL` is https; else false for local |
| Health check | `GET /api/health` → `{ ok, db, demo }` |
| Logging | JSON lines to stdout: event, learnerId hash, sessionId, stage, status, latencyMs |
| Reset session | Button clears active session server-side + optional new learner cookie |
| Ink data source | Curriculum atom fields only; no AI generation in lite |
| Error UX | Named errors in API JSON; user sees calm retry; never empty white screen |
| Test bar | Unit for rate limit helper; integration isolation stays; E2E one happy path + one 429 if feasible |
| Deploy docs | Keep single golden path: Docker entrypoint primary; Vercel secondary note |
| Content review | Native MSA spot-check before claiming depth expansion shipped |
| Observability alerts | Log-based only until live URL exists |

## Strongest challenges (top 3)

1. **Brand vs thin demo** — without Expansion 2, public impression fails “serious MSA.”
2. **Open write APIs** — without Expansion 3, cost/spam risk on any real traffic.
3. **No live URL (by choice)** — “posted on internet” remains aspirational; success is shippable artifact + expanded quality, not a hyperlink.

## Recommended path (implementation order)

1. Curriculum depth (domain seed + planner variety) + tests  
2. Rate limit helper + ownership already present  
3. Language Ink lite in task/input surface  
4. Health + structured logs + runbook snippet in README  
5. Homepage demo honesty (limits) + reset control  
6. Full verify: test / typecheck / lint / build / isolation / e2e  

## NOT in scope

Full V1 product, accounts, offline PWA sync, speech scoring, multi-region HA, analytics vendors, payments, social.

## Completion status

**DONE** — expansions decided; sections 1–11 evaluated with CEO defaults where user declined decisions.

## Implementation status (2026-07-11)

Implemented in commit on `main`: curriculum depth, rate limits, reset, Ink lite, health/logs/runbook. Tests 29 unit/integration + e2e green.
