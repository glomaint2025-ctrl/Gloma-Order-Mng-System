# 04 — Spikes

Run these before relying on the risky parts. Results are logged at the bottom of each spike.

## SPIKE-1: Concurrent sales of the last unit (MySQL row locks)
- **Risk:** Gloma and the shop sell the last unit at the same moment and stock goes to −1. SQLite (used in unit tests) ignores `FOR UPDATE`, so the unit tests can't prove this.
- **Test:** run MySQL 8 in Docker, seed 1 unit, start 10 parallel PHP processes that each place a 1-unit order. Pass = exactly 1 order succeeds and stock = 0.
- **Script:** `backend/scripts/spike-concurrency.sh`.
- **Result:** see the "Spike results" section in docs/09-TESTING.md.

## SPIKE-2: Courier tracking links
- **Risk:** the URL patterns for Koombiyo, Fardar and Royal Express are guesses, so customers get broken links.
- **Test:** for each courier, take one real tracking number, build the link from the pattern, and open it. Patterns are stored in the `couriers` table and editable in admin, so fixing one needs no deploy.
- **Status:** **NOT RUN** (needs real tracking numbers). The seeded patterns are marked ASSUMED.

## SPIKE-3: ServerByte Blazer shared hosting
- **Risk:** no SSH, or cron runs less often than every minute, or PHP < 8.2, or the docroot can't point to `current/public`. Any of these breaks deploys or the queue.
- **Test:** on the real account:
  1. `ssh` in, then `php -v` and `mysql --version`.
  2. Add the cron line and check that `storage/logs/cron.log` updates every minute.
  3. Symlink `public_html/uat → ~/apps/uat/current/public` and load `/api/v1/health`.
  4. Send one SMS (Text.lk) and one email (provider) with `php artisan portal:test-notify`.
- **Status:** **NOT RUN** (needs server access). If there's no SSH, the fallback is an FTP deploy action (see 08-OPERATIONS).
