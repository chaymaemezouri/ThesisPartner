#!/usr/bin/env bash
# Compatible with GitHub: ssh … "deploy $SHA"
# Resolve the git checkout via THESIS_APP_DIR, this script's repo path, or $PWD.
# Never runs: docker compose down, down -v, prisma migrate reset.
set -euo pipefail

SHA="${1:-}"
if [[ -z "$SHA" || ! "$SHA" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  echo "usage: deploy <git-sha>" >&2
  exit 1
fi
SHA="${SHA,,}"

resolve_root() {
  local here candidate
  if [[ -n "${THESIS_APP_DIR:-}" ]]; then
    candidate="$(cd "$THESIS_APP_DIR" && pwd)"
    if [[ -f "$candidate/docker-compose.yml" && -f "$candidate/docker-compose.production.yml" ]]; then
      printf '%s' "$candidate"
      return
    fi
    echo "THESIS_APP_DIR is not a ThesisPartner checkout" >&2
    exit 1
  fi
  here="$(cd "$(dirname "$0")" && pwd)"
  candidate="$(cd "$here/../.." && pwd)"
  if [[ -f "$candidate/docker-compose.yml" && -f "$candidate/docker-compose.production.yml" ]]; then
    printf '%s' "$candidate"
    return
  fi
  if [[ -f "$PWD/docker-compose.yml" && -f "$PWD/docker-compose.production.yml" ]]; then
    pwd
    return
  fi
  echo "Set THESIS_APP_DIR to the VPS git checkout (docker-compose.yml not found)" >&2
  exit 1
}

require_kb() {
  local path="$1"
  local need_kb="$2"
  local avail
  avail="$(df -Pk "$path" | awk 'NR==2 {print $4}')"
  if [[ -z "$avail" || "$avail" -lt "$need_kb" ]]; then
    echo "insufficient disk at $path (need ${need_kb} KiB)" >&2
    exit 1
  fi
}

env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env 2>/dev/null | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  line="${line#${key}=}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "$line"
}

require_env_key() {
  if ! grep -qE "^${1}=" .env 2>/dev/null; then
    echo "missing $1 in .env" >&2
    exit 1
  fi
}

ROOT="$(resolve_root)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.production.yml)
BACKUP_DIR="${ROOT}/backups"
mkdir -p "$BACKUP_DIR"

if [[ ! -f .env ]]; then
  echo "VPS .env is required next to docker-compose.yml" >&2
  exit 1
fi

APP_URL="$(env_value APP_URL)"
SMTP_HOST="$(env_value SMTP_HOST)"
S3_PUBLIC_URL="$(env_value S3_PUBLIC_URL)"
require_env_key APP_URL
require_env_key SMTP_HOST
require_env_key SMTP_FROM
require_env_key S3_ACCESS_KEY
require_env_key S3_SECRET_KEY

if [[ -z "$APP_URL" ]]; then
  echo "APP_URL is empty" >&2
  exit 1
fi
if [[ -z "$SMTP_HOST" || "$SMTP_HOST" == "mailpit" || "$SMTP_HOST" == "127.0.0.1" || "$SMTP_HOST" == "localhost" ]]; then
  echo "SMTP_HOST must be an external SMTP server (not Mailpit)" >&2
  exit 1
fi
PUBLIC_S3="${S3_PUBLIC_URL:-$APP_URL}"
if [[ "$PUBLIC_S3" == *localhost* || "$PUBLIC_S3" == *127.0.0.1* ]]; then
  echo "S3_PUBLIC_URL must be the public HTTPS origin" >&2
  exit 1
fi

DOCKER_ROOT="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
require_kb "$ROOT" 1048576
require_kb "${DOCKER_ROOT:-/}" 2097152

S3_VOL="$(docker volume ls -q | awk '/s3_data$/ {print; exit}')"
if [[ -z "$S3_VOL" ]]; then
  echo "no Docker volume matching s3_data; refusing to deploy without an S3 backup target" >&2
  exit 1
fi

echo "backup postgres"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
"${COMPOSE[@]}" exec -T postgres pg_dump -U thesispartner thesispartner \
  | gzip > "$BACKUP_DIR/postgres-${STAMP}.sql.gz"
test -s "$BACKUP_DIR/postgres-${STAMP}.sql.gz"
gzip -t "$BACKUP_DIR/postgres-${STAMP}.sql.gz"

echo "backup s3 volume $S3_VOL"
docker run --rm -v "${S3_VOL}:/data:ro" -v "$BACKUP_DIR:/backup" alpine:3.20 \
  tar czf "/backup/s3-${STAMP}.tgz" -C /data .
test -s "$BACKUP_DIR/s3-${STAMP}.tgz"
tar tzf "$BACKUP_DIR/s3-${STAMP}.tgz" >/dev/null

PREV="$(git rev-parse --verify HEAD)"
printf '%s\n' "$PREV" > "$BACKUP_DIR/previous-sha-${STAMP}.txt"
echo "previous=$PREV target=$SHA backups=$STAMP"

git fetch origin
git checkout --detach "$SHA"

# Data services: start if needed, never recreate, never down -v.
"${COMPOSE[@]}" up -d postgres redis s3
"${COMPOSE[@]}" build api web

# Prisma migrate deploy runs once in the API image CMD at this recreate.
# It is additive/idempotent. A later app rollback does not undo SQL.
"${COMPOSE[@]}" up -d --no-deps --force-recreate api web

HEALTH_URL="${APP_URL%/}/api/v1/health"
if ! bash "$ROOT/infrastructure/deploy/verify-health.sh" "$HEALTH_URL"; then
  echo "health failed; rolling back application to $PREV (SQL is not reverted)" >&2
  git checkout --detach "$PREV"
  "${COMPOSE[@]}" build api web
  "${COMPOSE[@]}" up -d --no-deps --force-recreate api web
  echo "restore db (manual): gzip -dc $BACKUP_DIR/postgres-${STAMP}.sql.gz | ${COMPOSE[*]} exec -T postgres psql -U thesispartner thesispartner" >&2
  echo "restore s3 (manual): docker run --rm -v ${S3_VOL}:/data -v $BACKUP_DIR:/backup alpine:3.20 tar xzf /backup/s3-${STAMP}.tgz -C /data" >&2
  exit 1
fi

echo "deployed $SHA"
echo "app rollback: git checkout --detach $PREV && ${COMPOSE[*]} up -d --build --no-deps api web"
echo "SQL/files restore is manual. A code rollback does not undo Prisma migrations."
