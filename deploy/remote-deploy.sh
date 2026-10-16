#!/usr/bin/env bash
# Runs ON the server (called by CI). Atomic release-folder deploy for cPanel shared hosting.
#
# Layout under DEPLOY_PATH (e.g. ~/apps/prod or ~/apps/uat):
#   releases/<id>/      one folder per deploy (last 5 kept)
#   shared/.env         created once by hand (run-book in docs/08-OPERATIONS.md)
#   shared/storage/     logs, sessions, payment slips — survives deploys
#   current -> releases/<id>     the domain's document root points to current/public
#   rollback.sh         copied here on each deploy
set -euo pipefail

DEPLOY_PATH="$1"
RELEASE="$2"
PHP="${3:-php}"
DIR="$DEPLOY_PATH/releases/$RELEASE"

cd "$DIR"
tar -xzf release.tgz && rm release.tgz

# Shared state
mkdir -p "$DEPLOY_PATH/shared/storage/app/private" "$DEPLOY_PATH/shared/storage/app/public" \
         "$DEPLOY_PATH/shared/storage/framework/cache/data" "$DEPLOY_PATH/shared/storage/framework/sessions" \
         "$DEPLOY_PATH/shared/storage/framework/views" "$DEPLOY_PATH/shared/storage/logs"
if [ ! -f "$DEPLOY_PATH/shared/.env" ]; then
  echo "ERROR: $DEPLOY_PATH/shared/.env is missing. Create it first (docs/08-OPERATIONS.md)." >&2
  exit 1
fi
ln -sfn "$DEPLOY_PATH/shared/.env" "$DIR/.env"
rm -rf "$DIR/storage" && ln -sfn "$DEPLOY_PATH/shared/storage" "$DIR/storage"

# App tasks (before switching traffic). Migrations must be backward compatible (expand → contract).
$PHP artisan migrate --force
$PHP artisan db:seed --class=Database\\Seeders\\DatabaseSeeder --force   # idempotent reference data
$PHP artisan optimize
$PHP artisan storage:link --force >/dev/null 2>&1 || true

# Switch traffic atomically
PREVIOUS="$(readlink "$DEPLOY_PATH/current" 2>/dev/null || true)"
echo "$PREVIOUS" > "$DEPLOY_PATH/previous_release"
ln -sfn "$DIR" "$DEPLOY_PATH/current.tmp" && mv -Tf "$DEPLOY_PATH/current.tmp" "$DEPLOY_PATH/current"
$PHP artisan queue:restart || true

cp "$DIR/remote-deploy.sh" "$DEPLOY_PATH/remote-deploy.sh"
cat > "$DEPLOY_PATH/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
# Points `current` back to the previous release. Database migrations are NOT reverted (see run-book).
set -euo pipefail
DEPLOY_PATH="$1"; PHP="${2:-php}"
PREV="$(cat "$DEPLOY_PATH/previous_release" 2>/dev/null || true)"
[ -n "$PREV" ] && [ -d "$PREV" ] || { echo "No previous release to roll back to." >&2; exit 1; }
ln -sfn "$PREV" "$DEPLOY_PATH/current.tmp" && mv -Tf "$DEPLOY_PATH/current.tmp" "$DEPLOY_PATH/current"
cd "$DEPLOY_PATH/current" && $PHP artisan optimize && $PHP artisan queue:restart || true
echo "Rolled back to $PREV"
ROLLBACK
chmod +x "$DEPLOY_PATH/rollback.sh"

# Keep the last 5 releases
ls -1dt "$DEPLOY_PATH"/releases/*/ | tail -n +6 | xargs -r rm -rf

echo "Deployed $RELEASE ($(cat "$DIR/REVISION" 2>/dev/null))"
