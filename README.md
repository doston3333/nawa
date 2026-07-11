# Nawa

Nawa is a serious Modern Standard Arabic learning notebook. This repository ships a **public Study Room demo**: focused 30–60 minute sessions with ability-specific progress, no gamification.

Open the app → **Continue path** → short modular lessons (unit → lesson). Optional long Study Room at `/study`. No account required.

## What visitors get

- Isolated browser learner (httpOnly cookie) — concurrent visitors do not share sessions
- Six-stage Study Room: Arrival → Retrieval → New concept → Input → Output → Close
- Beginner MSA spine (full abjad + ~200 words/phrases/grammar) and immutable evidence → mastery
- Transparent reading / listening / writing / speaking counts at session end

## Prerequisites

- Node.js 24+
- pnpm 10
- PostgreSQL 17 (local Docker Compose provided)

## Local setup

```bash
cp .env.example .env
docker compose up -d db
pnpm install
pnpm db:prepare   # generate client, migrate, seed curriculum
pnpm dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `ENABLE_PUBLIC_DEMO` | yes (`true`) | Cookie-isolated public learners |
| `ENABLE_DEMO_LEARNER` | optional | Legacy alias for public demo mode |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical site URL for metadata |
| `DEMO_LEARNER_ID` | no | Legacy seed helper only |

## Production / public demo

### One-time database

```bash
export DATABASE_URL=postgresql://...
export ENABLE_PUBLIC_DEMO=true
pnpm db:prepare
pnpm build
pnpm start
```

### Vercel + managed Postgres

1. Create a Vercel project from this repo (`vercel.json` included).
2. Attach Neon / Supabase / Vercel Postgres; set `DATABASE_URL`.
3. Set `ENABLE_PUBLIC_DEMO=true` and `NEXT_PUBLIC_SITE_URL=https://your-domain`.
4. After first deploy, run migrations once (Vercel build already runs `prisma generate`):

   ```bash
   DATABASE_URL=... pnpm db:migrate:deploy
   DATABASE_URL=... pnpm db:seed
   ```

   Or use the host’s one-off job / release command: `pnpm db:prepare`.

### Container (Fly / Railway / Render)

```bash
# build
docker build -t nawa .

# run (example — Postgres must be reachable from the container)
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/nawa \
  -e ENABLE_PUBLIC_DEMO=true \
  -e NEXT_PUBLIC_SITE_URL=https://your-app.example.com \
  nawa
```

`docker-entrypoint.sh` runs as user `nextjs` with a writable `$HOME`, applies `prisma migrate deploy`, seeds curriculum, then starts Next with:

`node node_modules/next/dist/bin/next start`

(Prisma client is generated at **image build** time; the container does not re-run `prisma generate`.)

Fly.io: see `fly.toml`. Create the app, attach Postgres, set secrets, then `fly deploy`.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e   # requires Playwright browsers + running DB
curl -s http://localhost:3000/api/health
```

## Runbook (public demo)

| Symptom | Check | Action |
|---------|--------|--------|
| Health 503 / “demo unavailable” | `GET /api/health` → `db` / `demo` | Fix `DATABASE_URL`; set `ENABLE_PUBLIC_DEMO=true` |
| Migrate failed on boot | Container logs `prisma migrate deploy` | Apply migrations manually: `pnpm db:migrate:deploy` |
| Users get 429 | Logs `rate_limited` | Expected under abuse; limits are process-local (10 starts/IP/hr, 120 attempts/learner/hr) |
| “Lost progress” after new browser | Cookie `nawa_learner_id` | Expected — anonymous demo; use Reset notebook for intentional clean start |
| Session start 503 | Logs `session_start_failed` | DB connectivity / demo flag |

Structured logs are JSON lines on stdout (`session_started`, `attempt_recorded`, `session_completed`, `rate_limited`).

## Program boundary

This is the **foundation Study Room vertical slice**, expanded with:

- ~200-atom beginner MSA spine (full letters + dense lexicon) + varied session content  
- Cookie isolation, rate limits, reset notebook  
- Language Ink lite (in-session micro-panel only)  
- Health endpoint + structured logs  

Still later:

- Plan 2: accounts, offline sync  
- Plan 3: Notebook, Reader, full Language Ink notes  
- Plan 4: speech / handwriting / bounded tutor  

See `docs/superpowers/plans/2026-07-11-nawa-v1-program-roadmap.md`.
