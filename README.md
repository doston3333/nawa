# Nawa

Nawa is a private, personal Modern Standard Arabic reading and writing workspace for two or three people. Each person selects a named, passwordless profile. Profiles are separate, and the same profile can be opened on more than one device.

Licensed under MIT.

**Shipped today:** sequenced MSA lessons, handwriting practice, profiles, IndexedDB outbox + Postgres sync, backups. **Not shipped:** OCR, translation, contextual AI analysis, PDF/image Reader, and Notebook — those are planned online-only actions, not implemented features.

The application is local-first. Previously opened learning shells and lesson data remain usable without a connection. Offline lesson progress is saved in the browser outbox and synchronizes once when the browser reconnects. Ordinary reading and writing never wait for an AI service. OCR, translation, contextual Arabic analysis, and future PDF/image processing are explicitly online-only actions.

## Prerequisites

- Node.js 24+
- pnpm 10
- Docker Desktop or Docker Engine with Compose

## Local production stack

The reference local stack runs the production image, PostgreSQL, and persistent application data:

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Open <http://localhost:3000>, choose or create a profile at `/profiles`, and keep the browser on the private machine or network. The database is published only on `127.0.0.1:5439` for local maintenance. PostgreSQL data is in the explicitly named `nawa_postgres` volume; uploaded originals and backup files are in `.data/` on the host. On Linux, the app initializes this private bind mount for UID 1001 and keeps it writable for the operator account so host-side backup commands continue to work.

For a VPS, set `NEXT_PUBLIC_SITE_URL` in `.env` to the HTTPS URL behind the reverse proxy before building the app. This keeps secure profile cookies aligned with the deployed origin.

For a faster development loop, run only PostgreSQL in Compose and run Next.js on the host:

```bash
docker compose up -d db
pnpm install
pnpm db:prepare
pnpm dev
```

## Profiles, offline use, and sync

Profiles have names but no passwords. This is a convenience boundary for a trusted household, not protection against a hostile user. Do not expose the app directly to the public internet; use a private LAN, VPN, or an access-controlled reverse proxy.

The visible sync status is intentionally simple:

- `Synced`: no pending local changes are known.
- `Saved locally · waiting to sync`: a lesson change is safe in this browser and is queued for the next connection.
- `Sync needs attention`: a server rejection or conflict needs review; the local outbox is retained.
- `Internet required for this action`: the selected operation is OCR, translation, or contextual AI analysis.

The service worker caches only previously successful learning shells. It never intercepts mutation requests. IndexedDB is profile-scoped, so switching profiles does not expose another person's cached progress. A stable mutation ID makes a retry idempotent: reconnecting cannot duplicate evidence or advance a lesson twice.

## Imports and AI boundary

The personal reading/writing scope accepts pasted text, PDFs, images, and scans in the later Reader milestone. The original source is preserved separately from extracted or translated text. Local reading and editing work offline; OCR, translation, and contextual analysis require an internet connection and must fail without replacing the original.

Speech, listening assessment, audio, pronunciation coaching, handwriting analysis, a general chat tutor, public-scale accounts, and distributed rate limiting are not part of this product. The existing process-local rate limit remains only as an accidental-abuse guard for one private process.

## Backups and restore

Backups include PostgreSQL and the persistent originals directory. Set `DATABASE_URL` to the local database (the Compose default is already in `.env`):

```bash
pnpm backup:local
# writes .data/backups/<UTC-timestamp>/{manifest.json,nawa.sql,uploads/}
pnpm restore:local -- .data/backups/<UTC-timestamp>
```

The host commands require PostgreSQL 17-compatible client tools (`pg_dump` and `psql`) on `PATH` (for example, `brew install libpq` on macOS). The `postgres:17-bookworm` database image contains matching tools for operators who prefer to run a Compose-side dump/restore; keep the dump stream on the host and do not use a client from an older major version.

Restore validates the manifest, dump, and uploads directory before changing anything. It refuses a non-local database URL; for an explicitly approved VPS restore, set `ALLOW_RESTORE=true` in the command environment. Uploads are staged before the database import, and `psql` runs as one transaction, so validation, copy, or database failures preserve the prior originals. After a successful database restore, a filesystem rename failure should be retried with the same backup before using the restored database with imported files. Test the safety checks without running `pg_dump` or `psql`:

```bash
pnpm backup:local -- --dry-run
pnpm restore:local -- .data/backups/<UTC-timestamp> --dry-run
```

Keep at least one backup outside the machine running Nawa. A restore replaces the target uploads directory after the database dump succeeds. The original source files remain the source of truth for later OCR or translation retries.

## Updates, rollback, and later VPS deployment

The same Compose stack is the reference for a later single-VPS deployment. Put a reverse proxy with HTTPS and access control in front of port 3000, keep PostgreSQL and `.data` on persistent disks, and keep PostgreSQL bound to loopback (never publish it beyond the VPS). Before an update:

```bash
pnpm backup:local
docker compose build app
docker compose up -d app
docker compose ps
curl -fsS http://localhost:3000/api/health
```

For rollback, stop the app, check out the previously known-good revision, rebuild the image, and start it again. Restore the most recent backup only when data was damaged; a code rollback does not require a database reset when migrations are backward-compatible.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
```

`pnpm test:e2e` requires the database and a running app. The health endpoint reports database readiness and includes the legacy demo compatibility flag for observability; the flag is disabled by default and named profile selection remains explicit in the active UI and routes.

## Documentation status

The original foundation plan is retained as a historical implementation record. Its unchecked boxes describe how the first Study Room slice was built; they are not a current backlog. The approved personal reading/writing design is [2026-07-12-nawa-personal-reading-writing-system-design.md](docs/superpowers/specs/2026-07-12-nawa-personal-reading-writing-system-design.md), and the current delivery plan is [2026-07-12-nawa-profiles-offline-sync.md](docs/superpowers/plans/2026-07-12-nawa-profiles-offline-sync.md). The roadmap lists the remaining Notebook, Reader, import, contextual Language Ink, personal curriculum, and delayed reading/writing assessment milestones.
