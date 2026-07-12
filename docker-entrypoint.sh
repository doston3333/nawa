#!/bin/sh
set -eu

# Bind-mounted data directories are commonly created as root on Linux. Make
# the persistent application data writable by the image's UID 1001, then run
# all application processes as that unprivileged user.
mkdir -p /app/.data /app/.data/uploads /app/.data/backups
chown -R nextjs:nodejs /app/.data
# The host-side `pnpm backup:local` command must also be able to write the
# backup directory after the container has initialized it. Nawa is intended
# for a private machine/VPS, so keep this shared bind mount writable by the
# operator account as well as UID 1001.
chmod -R a+rwX /app/.data

exec su -s /bin/sh nextjs -c '
# Client is generated at image build time; runtime only migrates + seeds + serves.
echo "Applying database migrations…"
./node_modules/.bin/prisma migrate deploy

echo "Seeding curriculum…"
./node_modules/.bin/tsx prisma/seed.ts

echo "Starting Nawa on port ${PORT:-3000}…"
exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
'
