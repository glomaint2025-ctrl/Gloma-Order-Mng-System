# 01 — Brief

## Goal
A back-office portal where Gloma International runs partner shops' **invested stock**. Gloma admin and shop owners both sell from one stock pool. The portal tracks orders, couriers, returns and COD, and every rupee, so each side can see clearly what was bought, what was sold, by whom, and what it earned.

## Success measures
1. A shop owner or Gloma admin can enter a delivery order in **under 60 seconds**, and a walk-in sale in **under 20 seconds**.
2. **Zero overselling:** stock can never go below 0, even when Gloma and the shop place orders for the last unit at the same second (proved by an automated test).
3. **Zero cross-shop data leaks:** automated tests prove a shop can never read another shop's rows.
4. For any shop, the sales report (qty bought, cost, sold by Gloma vs shop, revenue, charges, gross profit) matches the order and ledger totals to the cent.
5. Every dispatched order sends the customer an SMS and an email with a working tracking link, and every SMS is counted against its shop.

## Scope IN (phase 1)
- Gloma admin: create, suspend and close shops; create owner logins; record stock purchases; adjust and transfer stock; set the stock mode; manage couriers and templates; see all shops.
- Shop owner: switch between their shops; place orders and walk-in sales; manage payment methods and their own courier accounts; see stock, customers, money and reports.
- Orders: place → confirm → pack → dispatch (courier + tracking) → deliver or return, with a separate payment state, notes, the e-bill email, printed invoice and label PDFs, and the returned-customer warning.
- Stock ledger per location (single or by-location mode), and a money ledger in exact LKR.
- Dashboards (admin and shop), sales/profit report, money report, SMS usage report, audit log.

## Scope OUT (phase 1)
Storefront or customer login; profit-split calculation (done by hand, D34); courier APIs; Facebook/TikTok intake; bulk Excel upload; courier export files; exchanges; scheduled orders; staff logins; several stores per shop; shop-owned (non-invested) items.

## Users and roles
| Role | Who | Sees |
|---|---|---|
| Gloma admin | Gloma staff | Every shop, every setting |
| Shop owner | A partner who signed a contract | Only their own shops (one login, switches between them) |

## Constraints
- **Deadline:** phase 1 by 2026-10-23 (D49).
- **Hosting:** ServerByte "Blazer" shared cPanel plan (PHP 8.2+, MySQL/MariaDB, cron, SSH). Nothing that needs a long-running process.
- **Legal:** CBSL §83C: never show expected or guaranteed returns, no recruitment commissions, show only real figures. PDPA (in force 2027-01-01): privacy notice, role-based access, audit log, retention, breach run-book.
- **Money:** decimals only, in LKR. Timezone Asia/Colombo.

## Open questions
| # | Question | Owner |
|---|---|---|
| Q1 | Do the tracking-URL patterns for Koombiyo, Fardar and Royal work? (They're editable in admin.) | Developer, SPIKE-2 |
| Q2 | Does the ServerByte Blazer plan really give SSH, cron every minute, PHP ≥ 8.2, and which MySQL/MariaDB version? | Developer, SPIKE-3 |
| Q3 | Text.lk sender ID and account; transactional email provider (e.g. Brevo/Mailgun) and the domain's SPF/DKIM | Boss / developer |
| Q4 | Lawyer review of the shop contract before the first shop signs | Boss |
| Q5 | Final product name and domain | Boss |
| Q6 | Privacy notice text and the retention period (we assumed 5 years) | Boss + lawyer |
