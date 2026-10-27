# Decisions log

Every decision, with date and reason. Newest at the bottom. Source of the first batch: docs/00-CONTEXT.md §4.

| # | Date | Decision | Reason |
|---|---|---|---|
| D01 | 2026-10-13 | Multi-tenant: each shop's data is fully separate. | Many shops share one system. |
| D02 | 2026-10-13 | Back-office only. No storefront, no e-commerce website, no customer login. | The boss's direction. |
| D03 | 2026-10-13 | Shop owners AND Gloma admin can place orders. | The boss's direction. |
| D04 | 2026-10-13 | Couriers are third parties. When a parcel is handed over, the order gets the courier plus a tracking number or link. | No own delivery fleet. |
| D05 | 2026-10-14 | A shop signs a contract with Gloma first, then Gloma admin creates its portal and owner login. | Boss's answer. |
| D06 | 2026-10-14 | Only two logins for now: Gloma admin and shop owner. Staff logins come later. | Keep phase 1 small. |
| D07 | 2026-10-14 | A shop chooses "portal only" or "portal plus Gloma holding stock". | Boss's answer. |
| D08 | 2026-10-14 | One owner with several shops uses one login and switches between shops. | Boss's answer. |
| D09 | 2026-10-14 | The shop pays Gloma before each purchase. | Boss's answer. |
| D10 | 2026-10-14 | Both the shop and Gloma can find customers for and sell the invested stock. | Boss's answer. |
| D11 | 2026-10-14 | Gloma pays if held stock is damaged or lost at Gloma. | Boss's answer. |
| D12 | 2026-10-14 | One shared stock quantity that both the shop and Gloma see. No separate quantities. | Boss: "Both will see the same stock qty, no separate qtys." |
| D13 | 2026-10-14 | No approval and no notification when Gloma places an order for a shop. Stock just updates. | Boss's answer. |
| D14 | 2026-10-14 | No mixed orders: the shop places orders for its items, Gloma for its own. | Boss's answer (see OPEN 3). |
| D15 | 2026-10-14 | Stock goes down when an order is placed. | Prevents selling the same item twice. |
| D16 | 2026-10-14 | An order can be changed until it is packed. | Boss's answer. |
| D17 | 2026-10-14 | Confirmation calls for COD orders: the shop for its orders, Gloma for its orders. Slip upload is allowed if the customer pays in advance. | Boss's answer. |
| D18 | 2026-10-14 | Returned parcels go back to whoever sent them. They're checked, good items go back into stock and damaged ones are marked. A return reason is required. | Boss's answer. |
| D19 | 2026-10-14 | Track customers who return parcels, and show a warning when a new order is placed for them. | Boss's answer. |
| D20 | 2026-10-14 | Couriers: Koombiyo, Fardar Express, Royal Express. Gloma's courier account for Gloma's parcels, the shop's own account for its parcels. | Boss's answer. |
| D21 | 2026-10-14 | Tracking: pick the courier and type the tracking number, and the system builds the tracking link. | Boss's answer. Courier APIs come later. |
| D22 | 2026-10-14 | Order statuses must include processing → dispatched. On dispatch, the customer gets SMS and email with tracking. | Boss's answer. |
| D23 | 2026-10-14 | When an order is placed, an e-bill is emailed. A printed bill/waybill goes with the parcel. Printing covers the address label and the customer invoice. | Boss's answer. |
| D24 | 2026-10-14 | The system tracks all money for every order. | Boss's answer. |
| D25 | 2026-10-14 | The contract runs until the stock sells out. The shop can ask to end early: then profit is shared and the remaining stock is handed back. The shop gets paid out once sold out (or at early end). | Boss's answer. |
| D26 | 2026-10-14 | The shop keeps portal access until all its products are sold. | Boss's answer. |
| D27 | 2026-10-14 | A dashboard for profit and sales is required. | Boss's answer. |
| D28 | 2026-10-16 | No WebSockets or SSE. Live-ish screens refresh by polling (30–60 s). Background work runs through a database queue triggered by cron every minute. | Nothing in scope needs push. Keeps shared hosting possible. |
| D29 | 2026-10-16 | Proposed stack (confirm in STEP 5): Laravel (latest stable, PHP 8.2+) REST API + MySQL/MariaDB + React + TypeScript + Vite SPA built to static files. Sanctum (same-domain SPA auth), spatie/laravel-permission, dompdf, Laravel Excel. | Runs on cPanel shared hosting now and on a VPS later with the same code. Fits a CRUD, table-heavy system. |
| D30 | 2026-10-16 | Hosting: start on shared cPanel hosting (ServerByte being considered); must have SSH, PHP 8.2+, cron every minute, HTTPS. Move to a small VPS (~2 GB RAM, Nginx + PHP-FPM + OPcache + Redis + Supervisor) when real money and more shops arrive. | Cheap start, and moving needs no rewrite. |

## Answers to STEP 0 questions (form, 2026-10-16)

| # | Date | Decision | Reason |
|---|---|---|---|
| D31 | 2026-10-16 | Only **invested items** are in the system. "Portal only" shops are dropped from phase 1, which replaces D07 for now. | Boss: "only invested items with us". Developer chose to drop portal-only. |
| D32 | 2026-10-16 | Invested stock can sit at **Gloma and at the shop**. The stock ledger always records a location. Each shop has a **stock mode** setting: `single` (default: one shared number, the boss's rule) or `by_location` (Gloma qty and shop qty kept apart, and you can only sell what's at your own location). Admin can switch modes. | The boss wants one number. The developer worries couriers will be sent to an empty location. A toggle covers both. |
| D33 | 2026-10-16 | Whoever places the order ships it, from their own place and on their own courier account: Gloma's account for Gloma orders, the shop's account for shop orders. Both kinds of account are stored. | Boss and developer answer. |
| D34 | 2026-10-16 | **No profit-split calculation in the system.** The split is done by hand outside it. The system shows bought qty and cost, sold by Gloma vs by the shop, revenue, charges and gross profit. | Developer: "it will be managed manually". |
| D35 | 2026-10-16 | Gloma admin records stock purchases (product, qty, unit cost, location). There's no approval workflow in the system, because approval happens by contract and phone. The shop sees qty and cost, but no supplier bills. | Developer answer. Being open about costs also fits the CBSL rules. |
| D36 | 2026-10-16 | **Walk-in (counter) sales are allowed:** no delivery fee, no courier, and stock goes down. | Developer: walk-in customers exist and stock must stay correct. |
| D37 | 2026-10-16 | Money from an order belongs to **whoever placed it** (Gloma or the shop). Reports show how much each side holds. | Developer answer. |
| D38 | 2026-10-16 | **Payment methods are configurable per shop** (COD, bank transfer, card…) and picked from a dropdown on each order. Each method is either collected on delivery or prepaid, and prepaid methods can have a slip uploaded. | Developer answer. |
| D39 | 2026-10-16 | The customer pays the delivery fee, and it's recorded on the order. | Developer answer. |
| D40 | 2026-10-16 | You can't sell at zero stock. No backorders. | Developer answer. |
| D41 | 2026-10-16 | Permission grid: the defaults in CONTEXT §6.6 are accepted. | Developer answer. |
| D42 | 2026-10-16 | The order lifecycle follows standard commerce systems (like Medusa), with **separate fulfilment and payment states**: place → confirm → pack → hand to courier (tracking) → deliver or return, plus payment: unpaid → paid → refunded. | Developer: "follow the traditional order system steps". |
| D43 | 2026-10-16 | Phase 1 EzBiz extras: **order notes** and a **customer warning that never blocks** (it covers returns and a manual "risky" flag). Courier export files, bulk Excel upload, scheduled orders, staff logins and multi-store come later. | Developer: "don't block, just show a warning". |
| D44 | 2026-10-16 | Returned-customer history is per shop. Gloma admin sees it across all shops. | Lower PDPA risk. |
| D45 | 2026-10-16 | **Gloma pays for SMS** through one gateway account. Every SMS is logged per shop with its segment count and cost, so Gloma can bill the shop. | Developer answer. |
| D46 | 2026-10-16 | SMS and email **templates are editable**: a global default, with an optional per-shop override. Language is whatever the template says. Segment count follows Unicode rules, so Sinhala costs more. | Developer answer. |
| D47 | 2026-10-16 | Exchanges are phase 2. Phase 1 has returns only, and each return needs a reason. | Developer answer. |
| D48 | 2026-10-16 | Order intake in phase 1 is manual entry plus walk-in sales. | Developer answer. |
| D49 | 2026-10-16 | Phase 1 deadline is **7 days (2026-10-23)**. | Developer answer. |
| D50 | 2026-10-16 | **Working mode changed:** the developer authorised a fully autonomous build (docs and code, fully tested) with no per-step approval. This overrides the ground rules for this run. Questions that come up while the developer is away get industry-standard answers, logged here as **ASSUMED**. | Developer is away and wants the project finished. |
| D51 | 2026-10-16 | Stack: latest stable. Laravel 12 API (clean architecture: domain, application, infrastructure, HTTP), React 19 + TypeScript + Vite SPA, pnpm, Pest, Vitest. Docker Compose for local dev. Must run on the **ServerByte Blazer shared plan**. | Developer answer. |
| D52 | 2026-10-16 | CI/CD: a push to `main` auto-deploys to the production folder, and a push to `uat` auto-deploys to the UAT folder (on the uat subdomain). The developer sets up the server folders later. | Developer answer. |
| D53 | 2026-10-16 | Nothing is pushed to any remote, and nothing is ever done under the harmonycentermedia identity. Commits use the developer's private git identity. The developer adds the GitHub remote. | Developer instruction. |

## ASSUMED during the autonomous build (2026-10-16): industry-standard choices, confirm or change

| # | Date | Assumption | Reason |
|---|---|---|---|
| A01 | 2026-10-16 | The courier tracking URL patterns are guesses. They're editable in Admin → Couriers (must contain `{tracking}`). | No official docs yet (SPIKE-2). |
| A02 | 2026-10-16 | Text.lk API shape: `POST /api/v3/sms/send`, Bearer token, `recipient` without `+`. | Common Text.lk v3 usage. Verify with `portal:test-notify` (SPIKE-3). |
| A03 | 2026-10-16 | Customer data retention is 5 years without orders, then anonymised monthly (`portal:anonymize-customers`). | PDPA needs a rule. The lawyer confirms the period. |
| A04 | 2026-10-16 | A shop owner can run the lifecycle only on the **shop's** orders. Gloma admin can act on all. The owner still sees Gloma's orders. | D17/D33: each side calls and ships its own orders. |
| A05 | 2026-10-16 | Edit until packed (D16); **cancel until packed**. After dispatch, use the return flow. | Standard commerce rule (Medusa, Shopify). |
| A06 | 2026-10-16 | Payments are recorded as the **full order total** (no part payments in phase 1). Refund = full. | Keeps COD and money simple. |
| A07 | 2026-10-16 | "Sold" = delivered or walk-in completed, dated by `delivered_at`. COGS uses the **weighted average cost** stored on each order line. FIFO per purchase batch is phase 2. | Standard inventory costing. Accurate enough for gross profit. |
| A08 | 2026-10-16 | Every delivery order starts as "Awaiting confirmation" (one confirm step for COD and prepaid). | One simple flow (D17 confirmation call). |
| A09 | 2026-10-16 | A new shop gets 3 starting payment methods: Cash on delivery, Bank transfer (slip required), Cash. | Fewer setup steps. All editable (D38). |
| A10 | 2026-10-16 | The courier charge is recorded at dispatch (default per courier account, editable) as an expense on the seller's side. The return charge is recorded at return. | The money ledger needs costs per order (D24). |
| A11 | 2026-10-16 | Ledger sides: `party` = whose hands the money is in. Gloma side: shop payments (+), purchases (−), Gloma fees (+), payouts (−). Each seller side: order payments (+), refunds, courier and return charges (−). | Shows "how much each side holds" (D37) without split maths (D34). |
| A12 | 2026-10-16 | A closed shop is read-only for its owner. Gloma admin can still record the handover and ledger entries. | Contract end flow (D25, D26). |
| A13 | 2026-10-16 | The React SPA is built into `backend/public/app` and served by Laravel: one domain, one deploy, cookie auth. | Shared hosting + Sanctum SPA (D29). |
| A14 | 2026-10-16 | Deploy over SSH with release folders + an atomic symlink + auto-rollback on a failed health check. If the Blazer plan has no SSH, switch the upload step to FTP (SPIKE-3). | D52 + zero-downtime deploys on shared hosting. |
| A15 | 2026-10-16 | Order numbers are per shop: `SHOPCODE-000001`. | Readable on labels and phone calls. |
| A16 | 2026-10-16 | Session lifetime 8 hours, login throttle 5 per minute, API limit 240 requests per minute per user. | Common back-office defaults. |
| A17 | 2026-10-16 | The SMS cost per segment is configured in `.env` (0.64 LKR). Sinhala and other Unicode text count at 70/67 characters. | D45, D46. |

## After review and finalisation (2026-10-16)

| # | Date | Decision | Reason |
|---|---|---|---|
| D54 | 2026-10-16 | **Minimal, server-driven UI.** The API sends labels, colour tones, `available_actions`, warnings and totals; screens never decide business rules. | The developer asked for a very simple UI (referenced in 03-FEATURES since day 1, logged here). |
| D55 | 2026-10-16 | The frontend was built with Antigravity, then reviewed end to end against the real API. Six bugs were fixed (customer lookup/detail unwrap, live total, UTC dates, placeholders, guards), and contract tests now use the real backend response shapes. | Mocked tests had drifted from the real API. |
| D56 | 2026-10-16 | Added before go-live: forgot/reset password by email, CSV exports (orders, ledger, sales report), a daily/monthly sales trend, product photos, and PDPA export/erase for one customer (admin, `privacy.manage`). Erase keeps amounts and the ledger. | Standard needs for a live back office; PDPA data-subject rights from 2027-01-01. |
| D57 | 2026-10-16 | **Streamed responses must not rely on the tenant global scope.** CSV rows are produced after the `tenant` middleware ends, so exports filter by `shop_id` explicitly and `CsvExport` re-applies the shop during streaming. | A test caught cross-shop rows in an export; each protection is now tested on its own. |
| D58 | 2026-10-28 | **SMS goes through Dialog eSMS** (`SMS_DRIVER=dialog`, message-via-URL API), using the same account and mask as GlomaLoans for now. Text.lk stays available as a driver but is no longer the default plan (replaces the Text.lk assumption in A02). | The developer's direction: Gloma already uses Dialog eSMS. |
| D59 | 2026-10-28 | **Production is `https://shop.glomacapital.com`** on the StackCP (20i) Blaze plan, folder `~/apps/shop`, PHP 8.5, MariaDB 10.11. Code lives in `glomaint2025-ctrl/Gloma-Order-Mng-System`. A push to `main` deploys. There is no UAT site yet. | The developer's direction. Same host as GlomaCapital. |
| D60 | 2026-10-28 | **Answers to Q7 and Q8 (the boss).** Q7: yes, one payment can cover several orders at once, possibly as a credit or balance system (still to be designed, not built yet). Q8: no part payments or instalments, and no partial returns, for now. A return still covers the whole parcel (A05, A06 stay). | Business rule answer, given through the developer. |

## Open business decisions (need the boss)

None open. Q7 and Q8 were answered in D60.
