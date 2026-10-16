# 05 — Architecture

## Stack and why
| Part | Choice | Why |
|---|---|---|
| API | Laravel 12, PHP ≥ 8.2 | Runs on cPanel shared hosting with no daemon. Has queues, mail, scheduler and Sanctum built in. |
| DB | MySQL 8 / MariaDB 10.6+ (SQLite for fast tests) | What the shared host offers. Row locks for stock. |
| Auth | Sanctum SPA cookie (same domain) | No tokens in browser storage, and CSRF-protected. |
| Permissions | spatie/laravel-permission, checked by permission name | Staff roles later are only new seed rows. |
| PDF | barryvdh/laravel-dompdf | Pure PHP, so it works without headless Chrome. |
| Queue / cache | `database` driver, worker started by cron every minute | Shared hosting. Switch to Redis by `.env` alone. |
| UI | React 19 + TS + Vite SPA, built to static files and served by Laravel from `public/` | Same domain as the API, one deploy. Built in a separate session (see docs/FRONTEND-HANDOVER.md). |
| Tests | Pest (feature + unit), Larastan level 6, Pint | The quality bar in CLAUDE.md. |

## Parts
```
Browser (React SPA)
   │  JSON over HTTPS, cookie + CSRF
   ▼
Laravel  ─ Http layer (routes/api.php, Controllers, FormRequests, Resources = THE CONTRACT)
            │ calls only
            ▼
          Application layer  app/Domain/<Module>/Actions  (one use case = one class, runs the DB transaction)
            │ uses
            ▼
          Domain  app/Domain/<Module>/{Models,Enums,Support}  (Eloquent models, state rules, value objects)
            │ talks to the outside world only through
            ▼
          Infrastructure  app/Infrastructure/{Sms,Couriers}  (TextLk/Log SMS, Manual courier adapter)  + Laravel Mail
   │
   ├── MySQL (one DB, every tenant row has shop_id)
   ├── storage/app/private (payment slips)
   └── cron → schedule:run → queue:work --stop-when-empty (SMS, email)
```

## Boundaries (rules)
1. Controllers never touch the DB beyond loading a model. All writes go through an **Action**.
2. The UI never calls couriers, the SMS gateway or email directly. Only Actions do, through interfaces.
3. Every tenant model uses `BelongsToShop` (a global scope from `TenantContext`). The tenant comes **only** from the `{shop}` URL segment, checked by `tenant` middleware before route-model binding.
4. Stock changes **only** through `StockLedger` (it writes the movement and updates the locked level row in the same transaction).
5. Money changes **only** through `MoneyLedger` (append-only entries, never updated or deleted).
6. API Resources are the contract. Changing a field name or type in one is a contract change (see CLAUDE.md approvals).

## Modules (`app/Domain`)
`Shops` · `Users` (roles/permissions) · `Catalog` (products) · `Inventory` (purchases, movements, levels, stock mode) · `Customers` (phone, warnings) · `Orders` (lifecycle, notes, payments, returns, documents) · `Finance` (ledger, reports, dashboards) · `Couriers` · `Notifications` (templates, message log) · `Audit`.

## The contract (summary; the full field list is in docs/API.md)
- Base `/api/v1`. JSON. Money = **string with 2 decimals** (`"1250.00"`). Qty = integer. Dates = ISO-8601 with the +05:30 offset.
- Single resource → `{ "data": {...} }`. List → `{ "data": [...], "meta": { current_page, last_page, per_page, total } }`.
- Errors: `401` not logged in · `403 {message}` not allowed · `404` not found or another shop's row · `409 {message, code}` business rule (e.g. `insufficient_stock`, `invalid_transition`, `stale_version`, `shop_closed`) · `422 {message, errors{field:[..]}}` validation.
- Every order carries `status`, `status_label`, `payment_status`, `payment_status_label`, `available_actions[]`, `warnings[]`, `version`. The UI shows buttons only from `available_actions`.
- Enums are sent as `{ value, label }` lists from `GET /api/v1/meta`, so the UI never hard-codes labels.

## Data model (main tables)
| Table | Key columns |
|---|---|
| users | name, email, password, is_active, last_login_at (+ spatie roles: `gloma_admin`, `shop_owner`) |
| shops | name, code (unique, used in order numbers), status `active/suspended/closed`, stock_mode `single/by_location`, contract_ref, contract_started_on, phone, email, address, order_seq |
| shop_user | shop_id, user_id |
| couriers | code (koombiyo/fardar/royal), name, tracking_url_template (`{tracking}`), is_active |
| courier_accounts | shop_id **nullable** (null = Gloma's), courier_id, label, account_ref, is_active |
| products | shop_id, sku, name, description, price, avg_cost, is_active |
| stock_purchases / stock_purchase_lines | shop_id, reference, supplier, purchased_on, total · lines: product_id, location, qty, unit_cost, line_total |
| stock_levels | shop_id, product_id, location `shared/gloma/shop`, qty (projection, row-locked) |
| stock_movements | shop_id, product_id, location, qty (±), type, reason, source_type/id, user_id, created_at (append-only) |
| customers | shop_id, phone (E.164 +94…), name, email, address, city, is_risky, risk_note, orders_count, returns_count |
| payment_methods | shop_id, name, kind `cod/prepaid`, requires_slip, is_active |
| orders | shop_id, number, channel `delivery/walk_in`, seller `gloma/shop`, placed_by_user_id, customer_id + snapshot (name, phone, email, address, city), status, payment_status, payment_method_id, subtotal, discount, delivery_fee, total, courier_account_id, tracking_number, tracking_url, courier_charge, return_reason, return_charge, cancel_reason, timestamps per step, version |
| order_items | order_id, product_id, name, sku, location, qty, unit_price, unit_cost, line_total, returned_good_qty, returned_damaged_qty |
| order_events | order_id, user_id, type, from_status, to_status, meta, created_at (timeline) |
| order_notes | order_id, user_id, body |
| payments | order_id, shop_id, kind `payment/refund`, amount, payment_method_id, reference, slip_path, recorded_by, paid_at |
| ledger_entries | shop_id, party `gloma/shop`, type, amount (±, decimal 14,2), order_id?, purchase_id?, description, occurred_on, created_by (append-only) |
| message_templates | shop_id nullable, event `order_placed/order_dispatched`, channel `sms/email`, subject, body, is_active |
| message_logs | shop_id, order_id, channel, recipient, body, segments, cost, status `queued/sent/failed`, provider_ref, error |
| audit_logs | user_id, shop_id, action, subject_type/id, changes (json), ip, created_at |

## Order state rules
```
delivery:  awaiting_confirmation → processing → packed → dispatched → delivered
                     │                 │          │           └────→ returned
                     └──── cancelled ←─┴──────────┘          (delivered → returned also allowed)
walk_in:   completed (on creation)
payment:   unpaid → paid → refunded
```
- Edit: only `awaiting_confirmation` or `processing`. Cancel: up to `packed`.
- Stock goes down on create (D15) at the seller's location: `shared` in single mode; `gloma` or `shop` in by-location mode.
- Return puts good qty back where it came from. Damaged qty is recorded only.
- Ledger entries come from: purchase (−, Gloma side spends the shop's money), shop payment (+ Gloma side), order payment (+ seller side), refund (−), courier charge (−), return charge (−), Gloma fee, payout, adjustment.

## Rendering and caching
- API responses: no HTTP caching (private data). `GET /meta` and `GET /couriers` are cached in the app cache for 1 hour and cleared on edit.
- Live-ish screens (orders list, dashboard) poll every 30–60 s (D28). The dashboard is computed on request with indexed aggregate queries; add a cache when a shop passes about 50k orders.
- SPA static files: hashed filenames, served with long cache headers; `index.html` is no-cache.

## Security
- Secrets only in `.env` (never in git or in the SPA bundle). Text.lk key and mail credentials are used only server-side.
- Sanctum cookie with `SameSite=Lax`, `secure` in production, CSRF on writes; logins throttled to 5 per minute per email+IP.
- Policies and permission checks on every endpoint. Tenant scope plus `{shop}` membership check. Cross-shop access returns 404.
- Payment slips on the private disk, served only through an authorised endpoint.
- Audit log on every write.
