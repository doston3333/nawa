# Nawa

Nawa is a serious Modern Standard Arabic learning notebook. This repository currently implements the foundation and adaptive Study Room vertical slice.

## Prerequisites

- Node.js 24 LTS
- pnpm 10
- Docker with Compose

## Local setup

1. `cp .env.example .env`
2. `docker compose up -d db`
3. `pnpm install`
4. `pnpm db:generate`
5. `pnpm prisma migrate dev`
6. `pnpm db:seed`
7. `pnpm dev`

Open <http://127.0.0.1:3000/study>.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e`

## Program boundary

Authentication and offline synchronization are Plan 2. Notebook, Reader, Language Ink, and imports are Plan 3. Speech, handwriting, the bounded tutor, and Arabic validation are Plan 4. See `docs/superpowers/plans/2026-07-11-nawa-v1-program-roadmap.md`.
