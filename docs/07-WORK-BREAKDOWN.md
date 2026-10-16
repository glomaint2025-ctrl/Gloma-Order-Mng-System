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
| T15 | Frontend (built with Antigravity) + review: real-API contract tests, 6 bug fixes | frontend | 25 FE tests, E2E main flow in browser |
| T16 | Forgot / reset password (API + pages) | Http/Auth, frontend | reset link round-trip tested in browser |
| T17 | CSV exports (orders, ledger, sales report) | Support/CsvExport | tenant-leak test passes with each guard alone |
| T18 | Sales trend, product photos | Finance/Queries, Catalog | backend + FE tests |
| T19 | PDPA export/erase, retention job reuses it | Customers/Services/CustomerPrivacy | erase keeps ledger; audit logged |
| T20 | FE quality: lint 0, code-split routes | frontend | 0 warnings; main bundle 489 KB |

**Status (2026-10-16):** T00–T20 all done (D50, D55, D56) as local commits on `main`; `uat` points at the same commit. There is no remote yet (D53); the branch and PR flow begins once the developer adds the private GitHub remote. Frontend tasks: docs/FRONTEND-HANDOVER.md.
