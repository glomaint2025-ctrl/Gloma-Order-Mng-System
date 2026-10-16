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
