# 02 — Phases

| Phase | What ships | Done when |
|---|---|---|
| **1 — Run one invested shop** (by 2026-10-23) | Everything in Brief "Scope IN": shops, owners, products, purchases, the stock ledger (single or by-location), manual and walk-in orders with the full lifecycle, payments, returns, notes, the customer warning, e-bill email, dispatch SMS and email, invoice and label PDFs, money ledger, dashboards, reports, SMS usage, audit log, CI/CD to UAT and production. | A real shop's stock is entered, Gloma and the owner each place, dispatch and deliver orders on UAT, one return is processed, and the reports match by hand. |
| **2 — Work faster** | Bulk Excel order upload (via the queue), courier export templates, exchanges, scheduled orders and reminders, a blocking blacklist, FIFO profit per purchase batch. | A shop moves its daily orders in by Excel and sends the courier file without retyping. |
| **3 — Team and channels** | Staff logins with permissions, several stores per shop, Koombiyo and Fardar API adapters (auto tracking and status), Facebook Lead Ads and TikTok webhooks as "to confirm" orders. | A shop with 2 staff and 2 Facebook pages runs a day with no manual tracking entry. |
| **4 — Scale** | Move to a VPS (Redis queue and cache, Supervisor workers, S3 files), optional push updates. | Same code, `.env` changes only. |

## Design goal that protects later phases
**Phase 2 and 3 are additions or swaps, never rewrites:**
- Couriers sit behind `CourierGateway` (the manual adapter now, API adapters later).
- SMS and email sit behind `SmsGateway` and Laravel Mail.
- Permissions are checked by **permission name** (spatie), never by role, so staff roles are only new seed rows.
- Every query is shop-scoped by one global scope, so "stores" can later become a sub-scope.
- Queue, cache and files are driver-based (database and local now, Redis and S3 later).
