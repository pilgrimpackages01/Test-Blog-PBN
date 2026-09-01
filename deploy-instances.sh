#!/usr/bin/env bash

set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir"

if [[ ! -f .env ]]; then
  printf 'Missing .env file in %s\n' "$script_dir" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

for variable in MONGODB_URI ADMIN_EMAIL ADMIN_PASSWORD JWT_SECRET; do
  if [[ -z "${!variable:-}" ]]; then
    printf 'Required variable is missing or empty: %s\n' "$variable" >&2
    exit 1
  fi
done

for i in {1..100}; do
  project_name="omnicms-$(printf '%03d' "$i")"
  printf 'Deploying %s...\n' "$project_name"

  npx --yes vercel deploy --prod --yes --force \
    --name "$project_name" \
    --build-env MONGODB_URI="$MONGODB_URI" \
    --build-env ADMIN_EMAIL="$ADMIN_EMAIL" \
    --build-env ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    --build-env JWT_SECRET="$JWT_SECRET" \
    --env MONGODB_URI="$MONGODB_URI" \
    --env ADMIN_EMAIL="$ADMIN_EMAIL" \
    --env ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    --env JWT_SECRET="$JWT_SECRET"
done

printf 'Completed deployments for omnicms-001 through omnicms-100.\n'