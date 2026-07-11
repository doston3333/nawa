#!/bin/sh
set -eu

# Client is generated at image build time; runtime only migrates + seeds + serves.
echo "Applying database migrations…"
./node_modules/.bin/prisma migrate deploy

echo "Seeding curriculum…"
./node_modules/.bin/tsx prisma/seed.ts

echo "Starting Nawa on port ${PORT:-3000}…"
exec node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
