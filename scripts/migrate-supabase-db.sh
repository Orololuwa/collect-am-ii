#!/usr/bin/env bash
#
# Copies the app's data from the Supabase-hosted Postgres into the local
# docker compose `db` service, then applies the remaining Prisma migrations.
#
# Usage:
#   SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
#     npm run db:migrate-from-supabase [-- --force]
#
# Use the *session* pooler (port 5432) or the direct connection string; the
# transaction pooler (port 6543) does not work with pg_dump.
#
# --force  Drop everything in the docker database's public schema first.
#          Without it, the script refuses to restore into a non-empty database.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-app}"
PG_IMAGE="postgres:17-alpine"
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is not set. See the usage notes at the top of $0." >&2
  exit 1
fi

# psql against the docker database, run inside the container.
local_psql() {
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

# psql against Supabase, run from a throwaway container (no local client needed).
supabase_psql() {
  docker run --rm "$PG_IMAGE" psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 "$@"
}

COUNT_QUERY_SQL="SELECT coalesce(string_agg(format('SELECT %L AS table_name, count(*) AS row_count FROM public.%I', tablename, tablename), ' UNION ALL ' ORDER BY tablename), 'SELECT NULL LIMIT 0') FROM pg_tables WHERE schemaname = 'public'"

echo "▶ Starting the docker database…"
docker compose up -d --wait db

existing_tables=$(local_psql -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
if [[ "$existing_tables" != "0" ]]; then
  if [[ "$FORCE" != true ]]; then
    echo "The docker database already has $existing_tables table(s) in the public schema." >&2
    echo "Re-run with --force to wipe it before restoring." >&2
    exit 1
  fi
  echo "▶ --force: wiping the public schema of the docker database…"
  local_psql -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

mkdir -p backups
DUMP_FILE="backups/supabase-$(date +%Y%m%d-%H%M%S).dump"

echo "▶ Dumping the public schema from Supabase to $DUMP_FILE…"
docker run --rm "$PG_IMAGE" pg_dump "$SUPABASE_DB_URL" \
  --schema=public --no-owner --no-privileges --format=custom >"$DUMP_FILE"

echo "▶ Restoring into the docker database…"
# --clean --if-exists replaces the empty `public` schema created by initdb.
docker compose exec -T db pg_restore --clean --if-exists --no-owner --no-privileges \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" <"$DUMP_FILE"

echo "▶ Applying pending Prisma migrations (removes the Supabase-only columns)…"
# Runs in the compose `migrate` service, so the host needs Docker but no Node.
docker compose run --rm --build migrate

echo "▶ Pointing saved templates at the Cloudinary copies of the placeholder logos…"
# Saved templates, checkout pages and receipts copy the sample logo URLs into
# their JSON, so rewrite them in every jsonb column.
local_psql <<'SQL'
DO $$
DECLARE
  col record;
  old_base text := 'https://iwvduhvsxhjpxapdochp.supabase.co/storage/v1/object/public/app-images/organization-logos/';
  new_base text := 'https://res.cloudinary.com/df1fw15ei/image/upload/';
  logos text[][] := ARRAY[
    ['logoipsum-288.svg', 'v1793263359/CollectAm/organization-logos/logoipsum-288_f4kynu.svg'],
    ['logoipsum-350.svg', 'v1793263360/CollectAm/organization-logos/logoipsum-350_xwfaex.svg'],
    ['logoipsum-397.svg', 'v1793263360/CollectAm/organization-logos/logoipsum-397_qipq43.svg'],
    ['logoipsum-404.svg', 'v1793263360/CollectAm/organization-logos/logoipsum-404_ercaqd.svg']
  ];
  i int;
  n bigint;
BEGIN
  FOR col IN
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'jsonb'
  LOOP
    FOR i IN 1 .. array_length(logos, 1) LOOP
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(%I::text, %L, %L)::jsonb WHERE %I::text LIKE %L',
        col.table_name, col.column_name, col.column_name,
        old_base || logos[i][1], new_base || logos[i][2],
        col.column_name, '%' || old_base || logos[i][1] || '%'
      );
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN
        RAISE NOTICE '  %.%: % row(s) with %', col.table_name, col.column_name, n, logos[i][1];
      END IF;
    END LOOP;
  END LOOP;
END $$;
SQL

echo "▶ Comparing row counts (Supabase → docker)…"
source_counts=$(supabase_psql -Atc "$(supabase_psql -Atc "$COUNT_QUERY_SQL")")
target_counts=$(local_psql -Atc "$(local_psql -Atc "$COUNT_QUERY_SQL")")

mismatch=false
while IFS='|' read -r table count; do
  [[ -z "$table" ]] && continue
  target=$(printf '%s\n' "$target_counts" | awk -F'|' -v t="$table" '$1 == t { print $2 }')
  # Tables dropped by the new migration are expected to disappear.
  if [[ -z "$target" && "$table" == "MockAccessTokenSession" ]]; then
    printf '  %-40s %8s → %8s (dropped)\n' "$table" "$count" "-"
    continue
  fi
  status="ok"
  if [[ "$count" != "$target" ]]; then
    status="MISMATCH"
    mismatch=true
  fi
  printf '  %-40s %8s → %8s %s\n' "$table" "$count" "${target:--}" "$status"
done <<<"$source_counts"

echo
echo "▶ Images still on Supabase Storage (move these to Cloudinary by hand):"
local_psql -At <<'SQL'
SELECT '  Organization ' || id || ': ' || "imageUrl" FROM "Organization" WHERE "imageUrl" LIKE '%supabase.co%'
UNION ALL
SELECT '  UserAccount ' || id || ': ' || "imageUrl" FROM "UserAccount" WHERE "imageUrl" LIKE '%supabase.co%';
SQL
cat <<'EOF'
  Upload each to Cloudinary (CollectAm/organization-logos or
  CollectAm/user-avatars), then point the row at the new URL, e.g.:

  UPDATE "UserAccount" SET "imageUrl" = '<cloudinary url>' WHERE id = '<id>';
EOF

if [[ "$mismatch" == true ]]; then
  echo "✖ Some row counts differ. Check the output above." >&2
  exit 1
fi

echo "✔ Done. Dump kept at $DUMP_FILE."
