# 09 — Testing

## Automated (run on every push by CI; locally: `composer run quality` in `backend/`)
| Suite | File | What it proves |
|---|---|---|
| Unit | `tests/Unit/SupportTest.php` | exact money maths and rounding, weighted average cost, +94 phone normalisation, SMS segment counting (GSM-7 160/153, Unicode/Sinhala 70/67) |
| Tenancy | `tests/Feature/TenancyTest.php` | another shop's data is 404 at every level, global scope on every tenant model, suspended and closed shops (success measure 3) |
| Auth | `tests/Feature/AuthTest.php` | login, me, logout, inactive users, login throttle, password change |
| Orders | `tests/Feature/OrderFlowTest.php` | placement, numbering, totals, oversell refused with nothing saved, price snapshot, walk-in, stock by seller location, the full lifecycle with tracking link, SMS and ledger, wrong-step 409s, owner vs Gloma orders, edit with version (stale = 409), cancel, return (good/damaged), refund, slip upload |
| Inventory | `tests/Feature/InventoryTest.php` | purchases (avg cost, ledger), adjustments, stock = sum of movements, stock mode switch with split, transfers, mode switch on open orders |
| Money & reports | `tests/Feature/FinanceAndReportTest.php` | sales report and dashboard match orders and ledger to the cent (success measure 4), COD outstanding, manual ledger signs, no "expected/forecast" wording (CBSL) |
| Customers & notifications | `tests/Feature/CustomerAndNotificationTest.php` | lookup and warnings, risky flag never blocks, per-shop history (admin sees cross-shop), Dialog eSMS and Text.lk payloads (`Http::fake`), provider failure doesn't break orders, e-bill email with PDF, Sinhala template cost, SMS usage |
| Admin | `tests/Feature/AdminTest.php` | onboarding a shop with an owner, multi-shop owner, owners blocked from admin, status changes, users, couriers, templates, audit log, admin dashboard |
| Go-live extras | `tests/Feature/GoLiveExtrasTest.php` | forgot/reset password (single-use token, no account probing), CSV exports (filters, BOM, formula-injection, **tenant isolation with each guard alone**), sales trend (daily/monthly, zero-filled), product photos (admin only, replace deletes old file), PDPA export/erase (keeps ledger, audit, retention job) |
| Frontend | `frontend/src/test/*` (Vitest) | API layer against **real backend response shapes** (`apiContract`), error interceptor, money and SMS helpers, Colombo dates, order form warnings and live total, available_actions buttons, reset-password page, trend chart, downloads |
| Contract | `tests/Feature/ContractTest.php` | JSON shapes the frontend relies on, money format, error shapes, PDFs, health |
| Concurrency (SPIKE-1) | `scripts/spike-concurrency.sh` | 10+ parallel sellers race for the last unit on MySQL: exactly one wins (success measure 2) |

Rules: tests never hit the real network (`Http::preventStrayRequests()`, the log SMS driver, `Mail::fake`). Every new tenant model gets an isolation test. Every bug fix gets a test.

**Current result (2026-10-16):** backend 106 tests / 803 assertions green on SQLite **and** MySQL 8.0.46; Larastan level 6: 0 errors; Pint clean; SPIKE-1 passed 3 out of 3 runs (12 parallel sellers). Frontend: typecheck 0 errors, lint 0 warnings, 32 Vitest tests, build OK. Main flows and all new features also clicked through in the browser against the running backend.

Rule learned (D55): frontend tests must use the backend's real response shapes (see `apiContract.test.ts`), not hand-written mocks of the API functions.

## UAT checklist (run on UAT before every production release)
Use two browsers: **A** = Gloma admin, **B** = shop owner.

**Onboarding**
- [ ] A: create a shop with a new owner. B can log in and sees only that shop.
- [ ] A: add 2 products and record a purchase. Stock and avg cost are correct, and the purchase shows in Money.
- [ ] A: record "money received from shop". The dashboard's invested and unspent figures are correct.
- [ ] B: add the shop's courier account. A: Gloma courier accounts exist.

**Orders: main flow**
- [ ] B: new delivery order. Phone `077…` saved as +94, the number is `CODE-000001`, stock goes down, and the e-bill email arrives with the PDF.
- [ ] B: confirm → pack → print label and invoice (check them on paper) → dispatch with a real tracking number. SMS and email arrive and **the tracking link opens the courier page**.
- [ ] B: mark delivered + record payment. Payment shows Paid; Money shows the payment on the shop side.
- [ ] A: place an order. B sees it but has no action buttons. A runs it with Gloma's courier account.
- [ ] Walk-in sale: completes and is paid at once, with no SMS.

**Edge cases**
- [ ] Two browsers sell the last unit at the same time: one succeeds, the other gets "Only 0 left".
- [ ] Both browsers open the same order and edit it: the second save gets "Someone else changed this order".
- [ ] Change a product price while an order form is open: the order keeps the typed price.
- [ ] Return a dispatched parcel with 1 damaged item: good items back in stock, the reason is shown, and the next order for that phone shows the warning.
- [ ] Cancel before packing: stock comes back. Cancel after dispatch: refused with a clear message.
- [ ] A prepaid method with a slip: payment can't be recorded without a slip; the slip opens.
- [ ] Flag a customer as risky: a warning on new orders, but the order can still be placed.
- [ ] Switch the shop to "by location" with a split. B can't sell stock that's only at Gloma. Switch back.
- [ ] Suspend the shop: B gets "This shop is suspended". Close the shop: B is read-only.
- [ ] Wrong password 6 times: "Too many login attempts".

**Go-live extras**
- [ ] "Forgot password?" → email arrives → link opens the reset page → new password works, old one doesn't.
- [ ] Export CSV on orders (with a filter), money and sales report opens correctly in Excel, Sinhala names readable.
- [ ] Dashboard sales trend matches the delivered sales figures.
- [ ] Admin uploads a product photo; it shows in the list. Owner has no photo buttons.
- [ ] Admin downloads a customer's data, then erases a test customer: order totals and money stay, name/phone are gone.

**Reports**
- [ ] The sales report for the test period matches a hand calculation (bought, sold by Gloma vs shop, gross profit).
- [ ] SMS usage (admin) shows the messages sent and their cost per shop.
- [ ] No screen shows "expected" or forecast figures.

**Ops**
- [ ] `/api/v1/health` is ok and `cron_last_run` is under 2 minutes old. The queue is empty after messages send.
- [ ] Audit log shows the actions above with user and time.

## Sign-off before production
| Who | Signs off |
|---|---|
| Developer (Heshan) | CI green, UAT checklist done, release log entry written |
| Boss | Business flows (orders, money, reports) on UAT match how the shop works |
| Lawyer (first release only) | Contract and privacy notice |
