#!/usr/bin/env bash
# SPIKE-1 — 10 parallel sellers race for the last unit. Run from backend/ with a MySQL .env (or env vars).
# Example:
#   DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_PORT=33061 DB_DATABASE=portal_test DB_USERNAME=root DB_PASSWORD=root \
#     bash scripts/spike-concurrency.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PARALLEL=${PARALLEL:-10}
read -r SHOP PRODUCT OWNER ADMIN < <(php scripts/spike-concurrency.php setup)
echo "shop=$SHOP product=$PRODUCT — starting $PARALLEL parallel sellers (owner + admin mixed)"

for i in $(seq 1 "$PARALLEL"); do
  if (( i % 2 )); then USER=$OWNER; else USER=$ADMIN; fi
  php scripts/spike-concurrency.php sell "$SHOP" "$PRODUCT" "$USER" &
done
wait

php scripts/spike-concurrency.php check "$PRODUCT" && echo "SPIKE-1 PASS" || { echo "SPIKE-1 FAIL"; exit 1; }
