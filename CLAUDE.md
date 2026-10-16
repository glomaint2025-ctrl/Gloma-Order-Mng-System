# CLAUDE.md — Gloma Shop Portal

Read `docs/00-CONTEXT.md`, `docs/DECISIONS.md` and `docs/05-ARCHITECTURE.md` before changing anything.

## Non-negotiable rules
1. **Tenant safety:** every tenant table has `shop_id` and its model uses `BelongsToShop`. Never use `withoutGlobalScopes()` outside admin-only code, and every new tenant model gets an isolation test.
2. **Stock only through `StockLedger`, money only through `MoneyLedger`.** Both are append-only. Never update or delete a movement or a ledger entry; correct it with a new one.
3. **Money is decimal:** `decimal(14,2)` in the DB, strings in JSON, `bcmath`/integer cents in PHP. Never floats.
4. **Writes go through Actions** (`app/Domain/*/Actions`) inside `DB::transaction`. Controllers stay thin.
5. **The UI never decides business rules.** The API sends `available_actions`, labels, warnings and totals.
6. **No "expected returns", forecasts or guaranteed profit** anywhere in the API or UI (CBSL §83C).
7. **Secrets only in `.env`.** Nothing secret in git, logs or API responses.
8. **Tests never hit the real network:** use `Http::fake()`, the `log` SMS driver and `Mail::fake()`.
9. **Every write is audit-logged** (`AuditLogger`).
10. **Timezone Asia/Colombo; phones stored as E.164 `+94…`.**

## Conventions
- PHP ≥ 8.2 (the platform is pinned in composer.json), Laravel 12, Composer via `tools/composer.phar`. Frontend uses pnpm.
- `declare(strict_types=1);` in new PHP files. Larastan level 6 must pass.
- Commits use Conventional Commits (`feat(orders): …`, `fix:`, `test:`, `docs:`, `chore:`).
- One feature per branch (`feat/<task-id>-short-name`). Merge to `uat` and then `main` through PRs only.
- Never commit or push under the harmonycentermedia identity (D53).

## Quality bar (before every PR) — run from `backend/`
```bash
composer run quality
```
That runs `pint --test`, `phpstan analyse`, and `pest` (SQLite in-memory). CI runs the same suite again on MySQL 8.

## Who approves what
| Change | Approver |
|---|---|
| Contract change (an API Resource field, an endpoint, an enum value) | Developer (Heshan), and update docs/API.md plus the FE handover |
| DB migration on UAT or production | Developer, after a backup (run-book in 08-OPERATIONS) |
| Production deploy (merge to `main`) | Developer, after the UAT checklist in 09-TESTING |
| Business rule change | The boss, logged in DECISIONS.md |
