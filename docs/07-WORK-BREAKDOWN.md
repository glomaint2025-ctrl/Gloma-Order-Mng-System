# 07 — Work breakdown (phase 1, backend)

One task = one branch = one PR (about 15 minutes to review). The riskiest work and the contract come first. FE tasks live in docs/FRONTEND-HANDOVER.md.

| ID | Goal | Area | Done when |
|---|---|---|---|
| T00 | Repo skeleton, tooling, CI quality bar, Docker dev | root, backend, .github | `composer run quality` is green locally and in CI |
| T01 | Tenancy core: `TenantContext`, `BelongsToShop`, `tenant` middleware, shops, shop_user, roles and permissions seed | Domain/Shops, Users | isolation test proves shop A can't read shop B (404) |
| T02 | Auth: Sanctum SPA login, logout, me, login throttle | Http/Auth | login, me and logout tests pass, plus a throttle test |
| T03 | Contract base: error rendering (409 codes), `GET /meta`, money and phone value objects | Support, Http | unit tests for Money, phone normalisation, segments |
| T04 | Catalog and inventory: products, purchases, `StockLedger`, levels, adjustments, transfers, stock mode switch | Domain/Catalog, Inventory | stock always equals the sum of movements; mode-switch tests |
| T05 | Orders core: create (row locks, seller location, numbering), edit with version, walk-in | Domain/Orders | oversell test, stale-version test |
| T06 | Order lifecycle: confirm, pack, dispatch (courier + tracking link), deliver, cancel, return, `available_actions`, events timeline | Domain/Orders, Couriers | transition-matrix tests |
| T07 | Payments and refunds, slips, `MoneyLedger`, manual ledger entries | Domain/Finance | ledger balance tests |
| T08 | Customers: lookup, warnings, risky flag, per-shop history (admin sees cross-shop) | Domain/Customers | warning tests |
| T09 | Notifications: templates (global and shop), SMS gateway (log/Text.lk), e-bill and dispatch email, message log, SMS usage | Domain/Notifications, Infrastructure/Sms | `Http::fake`/`Mail::fake` tests, segment and cost tests |
| T10 | Documents: invoice and label PDFs, bulk print | Domain/Orders/Documents | PDF returns `application/pdf` |
| T11 | Dashboards and reports: shop dashboard, admin dashboard, sales/profit report, money report | Domain/Finance | report totals match fixture orders |
| T12 | Admin: shops CRUD with owner, users, couriers, Gloma courier accounts, audit log viewer | Http/Admin | permission tests (owner gets 403) |
| T13 | Ops: health endpoint, scheduler (queue via cron, retention), deploy workflows (main → prod, uat → uat), SPIKE-1 script | .github, routes/console | workflow YAML lint passes; health test passes |
| T14 | Docs: API.md, 08, 09, FE handover prompt | docs | handover is complete enough for a fresh session |

**Status:** built in one autonomous run on 2026-10-16 (D50). Because there's no remote yet (D53), the branch and PR flow begins once the developer adds GitHub.
