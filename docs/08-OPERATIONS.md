# 08 — Operations

## Environments
| Env | Where | Branch | DB | SMS / mail | Data |
|---|---|---|---|---|---|
| Local | Dev PC (XAMPP PHP 8.2 + SQLite, or `docker compose up`) | any | SQLite / MySQL 8 (Docker) | `log` / `log` or Mailpit | `DemoSeeder` |
| UAT | ServerByte Blazer, `uat.<domain>` → `~/apps/uat/current/public` | `uat` (auto-deploy) | MySQL `<user>_uat` | Dialog eSMS / provider | `DemoSeeder` allowed |
| Production | ServerByte Blazer, `<domain>` → `~/apps/prod/current/public` | `main` (auto-deploy) | MySQL `<user>_prod` | Dialog eSMS / provider | real; **never** DemoSeeder |

## Settings (`shared/.env` on the server)
| Name | Secret? | Local | UAT | Prod | Notes |
|---|---|---|---|---|---|
| APP_KEY | yes | ✓ | ✓ | ✓ | `php artisan key:generate --show`, different per env |
| APP_ENV / APP_DEBUG | no | local / true | staging / false | production / false | |
| APP_URL | no | http://localhost:8000 | https://uat.… | https://… | used in password-reset links and product photo URLs: must be exact |
| APP_VERSION | no | dev | set by CI (REVISION file) | — | optional |
| DB_* | password yes | sqlite | ✓ | ✓ | MySQL 8 / MariaDB 10.6+ |
| SANCTUM_STATEFUL_DOMAINS | no | localhost:5173,… | uat.… | … | the SPA host |
| SESSION_SECURE_COOKIE | no | false | true | true | HTTPS only |
| SESSION_DOMAIN | no | null | null | null | same domain |
| QUEUE_CONNECTION / CACHE_STORE | no | database | database | database | redis on VPS |
| MAIL_* | password yes | log | ✓ | ✓ | transactional provider + SPF/DKIM. Also needed for **forgot password** emails |
| SMS_DRIVER | no | log | dialog | dialog | `textlk` is still supported |
| DIALOG_ESMS_API_KEY | **yes** | — | ✓ | ✓ | same Dialog eSMS account as GlomaLoans (D58) |
| DIALOG_ESMS_SENDER_ID | no | — | ✓ | ✓ | registered mask, case-sensitive |
| SMS_COST_PER_SEGMENT | no | 0.64 | 0.64 | contract rate | used to bill shops |
| PORTAL_PRIVACY_URL | no | — | ✓ | ✓ | PDPA privacy notice |
| CUSTOMER_RETENTION_YEARS | no | 5 | 5 | lawyer-confirmed | ASSUMED 5 |

**GitHub (production, D59):** the only required secret is `SSH_PRIVATE_KEY` (the `glomacapital_deploy` private key). The workflow has defaults for everything else: `SSH_HOST=ssh.us.stackcp.com`, `SSH_USER=glomacapital.com`, `SSH_PORT=22`, `DEPLOY_PATH=/home/sites/42a/8/80f5d30b59/apps/shop`, `PHP_BIN=/usr/bin/php85`, `APP_URL=https://shop.glomacapital.com`. A secret with the same name overrides a default. On StackCP, cron goes in Scheduled Tasks (`crontab` is blocked) and databases are created in the web UI.

## Server first-time setup (once per environment)
1. cPanel → **PHP version** for the domain or subdomain: 8.2+ with `bcmath, intl, gd, zip, pdo_mysql, mbstring, fileinfo`.
2. cPanel → **MySQL**: create the DB and user, grant ALL. Note the credentials.
3. SSH: `mkdir -p ~/apps/uat/shared && nano ~/apps/uat/shared/.env` (copy `backend/.env.example`, fill in the table above).
4. cPanel → **Domains**: set the subdomain document root to `apps/uat/current/public`. (Main domain stuck on `public_html`? `mv public_html public_html.bak && ln -s ~/apps/prod/current/public ~/public_html`.)
5. cPanel → **SSH Access**: add the CI deploy public key (`ssh-keygen -t ed25519 -f gloma_deploy`), authorise it, and put the private key in GitHub secrets.
6. Push to `uat`. CI deploys, migrates and seeds the reference data.
7. First admin: `cd ~/apps/uat/current && php artisan portal:create-admin you@gloma.lk "Your Name"`.
8. cPanel → **Cron Jobs** (every minute):
   `* * * * * cd ~/apps/uat/current && /usr/local/bin/ea-php82 artisan schedule:run >> /dev/null 2>&1`
9. Check: `https://uat.<domain>/api/v1/health` shows `"status":"ok"` and `cron_last_run` updates every minute.
10. `php artisan portal:test-notify 07XXXXXXXX you@mail.com` to send one real SMS and one email (SPIKE-3).

## Deploy order (automatic, `.github/workflows/ci-cd.yml`)
1. Quality gate: Pint → Larastan → Pest on SQLite → Pest on MySQL → SPIKE-1 concurrency test. Frontend typecheck, lint, test and build once `frontend/` exists.
2. Build: `composer install --no-dev -o`; frontend built into `backend/public/app`.
3. Upload to `releases/<timestamp-sha>/`, link `shared/.env` and `shared/storage`.
4. `migrate --force` → seed reference data (idempotent, also syncs new permissions) → `optimize` → `storage:link` (product photos) → **atomic symlink swap** of `current` → `queue:restart`.
5. Health check `/api/v1/health` (5 tries). **On failure it rolls back automatically** to the previous release.
6. The last 5 releases are kept.

**Flow:** feature branch → PR into `uat` (CI green + review) → test on UAT with the checklist in 09-TESTING → PR `uat` → `main` → production.

## Rollback
- **Automatic:** a failed health check runs `~/apps/<env>/rollback.sh`.
- **Manual:** `bash ~/apps/prod/rollback.sh ~/apps/prod /usr/local/bin/ea-php82`. This swaps `current` back to the previous release.
- Migrations are **not** reverted automatically. Every migration must be backward compatible (expand → deploy → contract in a later release). If a migration itself is broken: restore the backup (see the migration run-book) and redeploy the previous commit.

## Release log (`docs/RELEASES.md`, one entry per production deploy)
```
## 2026-10-23 — v1.0.0 (abc1234)
- What: phase 1 go-live
- Migrations: yes (2026_10_16_130000_create_portal_tables)
- Checked by: Heshan (UAT checklist ✓)
- Rollback plan: rollback.sh + restore backup 2026-10-23-0900.sql.gz
- Issues after release: none
```

## Run-books

### Database migration on production
1. Announce a 10-minute window if the migration locks big tables.
2. Back up: `mysqldump --single-transaction -u USER -p DB | gzip > ~/backups/$(date +%F-%H%M).sql.gz`. Check the file isn't empty.
3. Merge to `main`. CI migrates. Watch the Actions log.
4. Check `/api/v1/health` and open one order.
5. If it's broken: `rollback.sh`; if the data is damaged: `gunzip < backup.sql.gz | mysql -u USER -p DB`.

### Go-live (phase 1)
- [ ] Lawyer approved the shop contract (CBSL) and the privacy notice (PDPA). `PORTAL_PRIVACY_URL` is set.
- [ ] Dialog eSMS mask registered. One real SMS received (`portal:test-notify`).
- [ ] Email provider domain verified (SPF, DKIM, DMARC). Email lands in the inbox, not spam.
- [ ] Courier tracking patterns checked with real numbers (SPIKE-2), and fixed in Admin → Couriers if needed.
- [ ] Cron running (`cron_last_run` is fresh). Queue empty.
- [ ] Production `.env`: `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, `SMS_DRIVER=dialog`.
- [ ] Admin login created. Demo data **not** present.
- [ ] Daily DB backup cron: `0 2 * * * mysqldump … | gzip > ~/backups/$(date +\%F).sql.gz && find ~/backups -mtime +14 -delete`.
- [ ] UAT checklist (09-TESTING) signed off.

### Rotating secrets
- **Dialog eSMS key:** create a new key in the Dialog eSMS portal → update `shared/.env` → `php artisan config:cache` → send a test SMS → revoke the old key.
- **Mail password:** same steps.
- **APP_KEY:** only if it has leaked. This logs everyone out and breaks encrypted values. Set `APP_PREVIOUS_KEYS=<old>`, then the new `APP_KEY`, then `config:cache`.
- **Deploy SSH key:** add the new key in cPanel → update the GitHub secret → remove the old key.
- **DB password:** cPanel → change the password → update `shared/.env` → `config:cache` → check health.

### Personal data breach (PDPA)
1. Contain: rotate credentials, disable affected logins (Admin → Users → deactivate), and put the site in maintenance mode if needed (`php artisan down`).
2. Assess: use the audit log (`/admin/audit-logs`) and server logs to find what data, which shops, and when.
3. Notify the Data Protection Authority and the affected shops within the time the DPA requires (confirm with the lawyer). Keep a written record.
4. Fix the cause, add a test, and record it in the release log.

### Queue stuck / messages not sent
Check `/api/v1/health` (`queue.pending`, `failed`, `cron_last_run`). If cron is stale, fix the cron line. If failed > 0, run `php artisan queue:failed` to read the errors (usually SMS balance or credentials), fix them, then `php artisan queue:retry all`.
