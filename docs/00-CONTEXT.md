# PROJECT CONTEXT (save as docs/00-CONTEXT.md)

Handoff from the brainstorm held 13–16 October 2026. Working name: **Gloma Shop Portal** (final name OPEN).

## 1. Who we are

- **Gloma International**, Sri Lanka: digital marketing, web development and IT solutions. Gloma builds and runs this system.
- I am the developer and planner. "The boss" is the business owner who decides business rules. His answers are in section 5.

## 2. What we are building, in one paragraph

A web-based back-office system (a "portal") for shops that partner with Gloma. It is two things in one:

1. **Order and stock management for online sellers, like EzBiz.lk.** Covers orders, stock, couriers and tracking, cash on delivery (COD), returns and reports.
2. **Gloma's invested-stock model.** A shop signs a contract and gives Gloma money. Gloma buys stock with it, holds it, and sells and ships it. When the stock is sold out (or the shop ends the deal), the profit is shared with the shop.

It is NOT an online store. There's no customer-facing website and customers never log in.

## 3. Where the idea came from (references)

- **Genzo Holdings (genzo.lk):** a Sri Lankan company that runs many partner "businesses" under one umbrella and handles their products, sales and delivery. It was the original inspiration for the partner model. Its public site doesn't explain the money terms.
- **EzBiz.lk (Convergence Lanka, Battaramulla):** the boss said "we want something like this". It's a portal for online store owners with these features:
  - manage several stores in one account
  - staff ("agents") per store, with role-based access
  - track return packages and exchange packages separately
  - order scheduling for future dates, with reminders
  - notes on each order, with reminders
  - individual and bulk order creation
  - "dynamic templates": export the day's orders in each courier company's own upload format
  - blacklist fraudulent customers
  - customer ordering analytics before dispatch (past orders, returns, deliberate returns)
  - real-time stock check
  - reports on COD received and still owed, courier payments, and return charges

  Pricing is tiered by orders per month: a 7-day free trial (1 user, 1 store, 50 orders), then 1,000, 2,000 and 3,500 orders, then a custom Corporate plan. Users and stores are unlimited on paid plans. EzBiz gets orders from Facebook and TikTok by **manual and bulk entry**. There's no automatic pull.
- **Our difference from EzBiz:** the invested-stock and profit-share side, and Gloma acting as a seller and shipper too.

## 4. Decisions already made (copy into DECISIONS.md)

| Date | Decision | Reason |
|---|---|---|
| 2026-10-13 | Multi-tenant: each shop's data is fully separate. | Many shops share one system. |
| 2026-10-13 | Back-office only. No storefront, no e-commerce website, no customer login. | The boss's direction. |
| 2026-10-13 | Shop owners AND Gloma admin can place orders. | The boss's direction. |
| 2026-10-13 | Couriers are third parties. When a parcel is handed over, the order gets the courier plus a tracking number or link. | No own delivery fleet. |
| 2026-10-14 | A shop signs a contract with Gloma first, then Gloma admin creates its portal and owner login. | Boss's answer. |
| 2026-10-14 | Only two logins for now: **Gloma admin** and **shop owner**. Staff logins come later. | Keep phase 1 small. |
| 2026-10-14 | A shop chooses "portal only" or "portal plus Gloma holding stock". | Boss's answer. |
| 2026-10-14 | One owner with several shops uses one login and switches between shops. | Boss's answer. |
| 2026-10-14 | The shop pays Gloma **before** each purchase. | Boss's answer. |
| 2026-10-14 | Both the shop and Gloma can find customers for and sell the invested stock. | Boss's answer. |
| 2026-10-14 | Gloma pays if held stock is damaged or lost at Gloma. | Boss's answer. |
| 2026-10-14 | **One shared stock quantity** that both the shop and Gloma see. No separate quantities. | Boss: "Both will see the same stock qty, no separate qtys." |
| 2026-10-14 | No approval and no notification when Gloma places an order for a shop. Stock just updates. | Boss's answer. |
| 2026-10-14 | No mixed orders: the shop places orders for its items, Gloma for its own. | Boss's answer (see OPEN 3). |
| 2026-10-14 | Stock goes down when an order is **placed**. | Prevents selling the same item twice. |
| 2026-10-14 | An order can be changed until it is **packed**. | Boss's answer. |
| 2026-10-14 | Confirmation calls for COD orders: the shop for its orders, Gloma for its orders. Slip upload is allowed if the customer pays in advance. | Boss's answer. |
| 2026-10-14 | Returned parcels go back to whoever sent them. They're checked, good items go back into stock and damaged ones are marked. **A return reason is required.** | Boss's answer. |
| 2026-10-14 | Track customers who return parcels, and show a warning when a new order is placed for them. | Boss's answer. |
| 2026-10-14 | Couriers: **Koombiyo, Fardar Express, Royal Express.** Gloma's courier account for Gloma's parcels, the shop's own account for its parcels. | Boss's answer. |
| 2026-10-14 | Tracking: pick the courier and type the tracking number, and the system builds the tracking link. | Boss's answer. Courier APIs come later. |
| 2026-10-14 | Order statuses must include processing → dispatched. On dispatch, the customer gets **SMS and email** with tracking. | Boss's answer. |
| 2026-10-14 | When an order is placed, an **e-bill is emailed**. A **printed bill/waybill** goes with the parcel. Printing covers the address label and the customer invoice. | Boss's answer. |
| 2026-10-14 | The system tracks **all money for every order**. | Boss's answer. |
| 2026-10-14 | The contract runs until the stock sells out. The shop can ask to end early: then profit is shared and the remaining stock is handed back. The shop gets paid out once sold out (or at early end). | Boss's answer. |
| 2026-10-14 | The shop keeps portal access until all its products are sold. | Boss's answer. |
| 2026-10-14 | A **dashboard for profit and sales** is required. | Boss's answer. |
| 2026-10-16 | No WebSockets or SSE needed. Live-ish screens refresh by polling (30–60 s). Background work runs through a database queue triggered by cron every minute. | Nothing in scope needs push. Keeps shared hosting possible. |
| 2026-10-16 | Proposed stack (confirm in STEP 5): **Laravel (latest stable, PHP 8.2+) REST API + MySQL/MariaDB + React + TypeScript + Vite SPA built to static files.** Sanctum (same-domain SPA auth), spatie/laravel-permission, dompdf, Laravel Excel. | Runs on cPanel shared hosting now and on a VPS later with the same code. Fits a CRUD, table-heavy system. |
| 2026-10-16 | Hosting: start on shared cPanel hosting (ServerByte is being considered). It must have SSH, PHP 8.2+, cron every minute and HTTPS. Move to a small VPS (about 2 GB RAM, Nginx + PHP-FPM + OPcache + Redis + Supervisor) when real money and more shops arrive. | Cheap start, and moving needs no rewrite. |

## 5. Business rules: boss's answers (raw), 14 Oct 2026

The boss filled in a multiple-choice questionnaire. His notes, kept as he wrote them:

- **How Gloma earns:** "Share system. At the end of deal we share profit with shop." (The exact split is OPEN.)
- **What the shop gets:** "Just enough how much earn, sales nothing more."
- **Unsold items:** "Just need to sell items until end stock. Any way if shops asks the remaining stocks can be able to handover."
- **Money scope:** "In this system have only invested items with us, no custom items that they own. Those are not included into system."
- **Anything else:** "Return users tracking so when placing new order we can show a warning if the user already returned something." "Need a dashboard to see profit and sales."

## 6. OPEN questions (must be answered before or during planning)

1. **Which items are in the system?** The boss says only invested items, not the shop's own items. Earlier we assumed both. Decide.
2. **Where does invested stock physically sit?** With one shared quantity, does any of it sit at the shop, or is it all at Gloma's store?
3. **"His items" vs "ours" when placing orders.** If all stock is invested stock with one quantity, what does the boss mean? Who packs and ships an order the shop places for invested stock: the shop or Gloma?
4. **Profit-share formula:** the split, which costs are deducted (purchase cost, courier, returns, Gloma fees), and when it's calculated.
5. **Unanswered questionnaire items:**
   - who decides what Gloma buys
   - what the shop sees about each purchase (supplier bills?)
   - whether stock can move between the shop and Gloma
   - whether Gloma ships shop-owned items
   - delivery fee when split
   - what happens on zero stock
   - where COD money for Gloma parcels goes
   - how Gloma's fees are paid
   - counter sales (in or out)
6. **Role permission grid** (Gloma admin vs shop owner, about 21 actions) is unanswered. Suggested defaults:
   - Gloma admin only: create and disable portals; manage invested stock; record payouts.
   - Shop owner: place orders, add tracking for own parcels, see own statement and reports.
   - Both: place orders, change or cancel orders before packing, mark delivered or returned.
7. **EzBiz features to include, and when:**
   - staff logins
   - several stores per shop (one per Facebook page)
   - bulk order upload (Excel)
   - courier export templates
   - exchanges as separate from returns
   - scheduled orders and reminders
   - order notes
   - blacklist
8. **Order intake:**
   - Phase 1: manual and bulk entry only (like EzBiz).
   - Later options: Facebook Lead Ads and TikTok Instant Forms pushed in by webhook as "new, to confirm" orders; a simple per-shop order-form link (the boss said no website, so ask); a WhatsApp or Messenger bot.
9. **Returned-customer warning:** per shop only, or shared across all shops? Sharing across shops is more useful but a bigger privacy risk.
10. **Who pays for SMS:** Gloma or the shop. And SMS language: Sinhala costs more (70 characters per SMS instead of 160).
11. **Pricing to shops** (if any besides the profit share), deadline, budget, final product name, and domain.

## 7. Legal and compliance (must shape the design)

- **Investment-scheme risk (Sri Lanka).** The Central Bank (CBSL) enforces Section 83C of the Banking Act against pyramid and unauthorised deposit-taking schemes. Penalties go up to 3 years' jail and/or a Rs. 1M fine, and CBSL published 25 prohibited institutions in July 2026. Rules:
  - **Never promise a fixed or guaranteed return.**
  - **No recruitment commissions.**
  - The shop owns its stock and earns only from actual sales.
  - The contract must be checked by a lawyer before shops sign.
  - The system should show real sales and costs transparently. It must never show "expected returns".
- **Personal Data Protection Act No. 9 of 2022.** The core obligations take effect **1 January 2027**, per the DPA gazette of 22 July 2026: lawful and transparent processing, breach notification, controller and processor contracts, and cross-border transfer rules. We store customer names, phones and addresses, and profile returners. Needs:
  - a privacy notice
  - role-based access
  - an audit log
  - a breach run-book
  - data retention rules
  - a check on where the servers are located

## 8. Architecture principles agreed so far

- **One database for all shops.** Every tenant-owned row has `shop_id`, enforced by a global scope plus tests that prove a shop can never read another shop's data.
- **Stock is a ledger of movements** (purchase-in, order-out, return-in, damage, correction with reason, transfer, handover-to-shop). Current quantity = sum of movements. It's never overwritten.
- **Order placement runs in a DB transaction with row locks.** The shop and Gloma sell from one shared quantity, so concurrency must be safe.
- **Money is a ledger of entries:**
  - payment from the shop
  - supplier purchase
  - COD collected
  - courier charge
  - return charge
  - Gloma fee
  - profit share
  - payout

  Use exact decimals in LKR, never floats. Statements and the final profit share are calculated from these entries.
- **Audit log** for who changed what, and when.
- **Phone numbers normalised to +94 format,** so returned-customer matching works.
- **Timezone Asia/Colombo.**
- **Courier layer:** one internal interface (create shipment, tracking URL, status) with one adapter per courier. Phase 1 adapter = manual tracking number + URL pattern + export template. API adapters come later. The UI never calls couriers directly.
- **SMS and email behind interfaces.** Text.lk is a candidate SMS gateway: about 0.64 LKR per SMS, has a PHP/Laravel library, and needs a sender ID (approval takes hours to 3 business days). Use a transactional email service with SPF/DKIM, not the shared host's mail.
- **Easy to move between servers:**
  - all config in `.env`
  - queue and cache = database now, Redis later
  - files through Laravel Storage (local now, S3-compatible later)
  - deploy from Git
  - same MySQL version everywhere
- **Polling, not push.** No WebSockets. If ever needed, use a hosted push service (Pusher/Ably) called from PHP.
- **PDFs with dompdf** (no headless Chrome on shared hosting). Big Excel imports run in batches through the queue.

## 9. Integration research notes (verify in spikes)

- **Koombiyo:** has a delivery API. A third-party SDK uses an API key for add order, pickup request, tracking and city lists. Ask Koombiyo for official docs and a key.
- **Fardar Express:** publishes its own Shopify app (order transfer, tracking), so an integration API exists. Request docs.
- **Royal Express:** no public API confirmed. Ask them directly.
- **Facebook Lead Ads:** webhooks on the `leadgen` field. Each shop connects its Page through Facebook Login with leads_retrieval, pages_manage_metadata, pages_show_list, pages_read_engagement and ads_management. Expect Meta app review and business verification. Later phase.
- **TikTok Instant Forms:** a Custom API with webhooks is available. Later phase.
- **Facebook Shops checkout and TikTok Shop** are not available in Sri Lanka as far as we know. Social platforms can only link out.

## 10. Reference links

- Genzo: https://genzo.lk
- EzBiz: https://ezbiz.lk and https://www.facebook.com/ezbizportal/
- Boss questionnaire with saved answers: https://claude.ai/artifact/FPWzbpY6RViQfV6djQk5pJ
- CBSL notice on prohibited schemes: https://www.cbsl.gov.lk/en/node/17922
- PDPA effective date (Daily FT): https://www.ft.lk/front-page/Data-protection-compliance-regime-takes-effect-on-1-Jan-2027/44-795776
- Koombiyo SDK: https://www.npmjs.com/package/koombiyo-sdk
- Fardar Shopify app: https://apps.shopify.com/fardar-express
- Text.lk: https://text.lk/faq
- Meta Lead Ads webhooks: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/quickstart/webhooks-integration/
- TikTok lead CRM integrations: https://ads.tiktok.com/help/article/available-crm-integrations-tiktok-lead-generation
