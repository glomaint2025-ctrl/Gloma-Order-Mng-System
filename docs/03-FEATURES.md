# 03 — Features

Tags: **P1/P2/P3** = phase · **M/S/C** = must / should / could.
UI principle (D54): minimal, plain screens. The API sends labels, allowed actions, warnings and totals, so screens do no business logic.

## Screens

### Everyone
| Screen | Purpose | Data | Actions | Tag |
|---|---|---|---|---|
| Login | Sign in | email, password | log in, "Forgot password?" | P1 M |
| Forgot / reset password | Self-service reset by email | email; new password | send link, set password | P1 M |
| Shop switcher | Pick a shop (owners with several shops; admin picks any shop) | my shops | switch | P1 M |

### Gloma admin
| Screen | Purpose | Data | Actions | Tag |
|---|---|---|---|---|
| Admin dashboard | Health of all shops | per shop: stock value, orders by status, sales by Gloma vs shop, COD outstanding | open a shop | P1 M |
| Shops | Manage partner shops | name, code, status, stock mode, owner(s), contract ref | create (with new or existing owner), edit, suspend, reactivate, close | P1 M |
| Users | Owner logins | name, email, shops, active | create, edit, reset password, deactivate | P1 M |
| Couriers | Courier list and tracking-link patterns | code, name, URL pattern | edit pattern, toggle active | P1 M |
| Gloma courier accounts | Gloma's own accounts per courier | courier, label, account ref | add, edit, remove | P1 M |
| Templates (global) | Default SMS and email text | event, channel, subject, body, placeholders | edit | P1 M |
| SMS usage | Bill shops for SMS | per shop per month: messages, segments, cost | filter by month | P1 M |
| Audit log | Who changed what | user, shop, action, before/after, time | filter | P1 S |

### Inside a shop (admin and owner; admin-only items marked ★)
| Screen | Purpose | Data | Actions | Tag |
|---|---|---|---|---|
| Shop dashboard | At-a-glance view | sales trend chart (daily or monthly, Gloma vs shop), stock qty and value, money invested / spent / unspent, sales by Gloma vs shop, orders to act on, COD outstanding, returns | jump to lists | P1 M |
| Products | Invested items | photo, SKU, name, price, avg cost, stock (total and by location) | ★create, ★edit, ★deactivate, ★upload/remove photo | P1 M |
| Stock | Levels and history | per product per location; movements with reason | ★adjust (correction, damage, handover), ★transfer, ★switch stock mode | P1 M |
| Purchases | Stock bought with the shop's money | date, supplier, lines (product, qty, unit cost, location), total | ★record purchase; owner views | P1 M |
| Exports | Work in Excel | orders (current filters), ledger with running balance, sales report | Export CSV | P1 S |
| Orders list | Daily work | number, customer, total, status, payment, placed by, warning badge | filter, search, open, new order, new walk-in | P1 M |
| New order / edit | Enter an order | customer phone (looked up with warnings), name, address, city, email, items, delivery fee, discount, payment method | save | P1 M |
| Walk-in sale | Counter sale | items, payment method, optional customer | save (completes at once) | P1 M |
| Order detail | One order | items, totals, customer warnings, status timeline, payment, tracking link, notes | only the buttons in `available_actions`: confirm, edit, pack, dispatch, deliver, return, cancel, record payment, refund, print invoice and label, add note | P1 M |
| Customers | People who ordered | name, phone, orders, returns, risky flag | search, view history, flag or unflag risky with a note, ★PDPA: download their data / erase (type ERASE) | P1 M |
| Money | Ledger statement | entries, balance per side (Gloma / shop) | ★add entry (shop payment, payout, Gloma fee, adjustment) | P1 M |
| Reports | Sales and profit | per product: bought, cost, sold by Gloma / shop, revenue, COGS, charges, gross profit; money held per side | date filter | P1 M |
| Settings | Shop setup | payment methods, shop courier accounts, template overrides | add, edit, disable | P1 M |
| Bulk print | Print many labels and invoices | selected orders | download PDF | P1 S |

## Main flows

**F1 — Onboard a shop (admin):** the contract is signed offline → Shops → Create (name, code, contract ref, owner email and password) → add payment methods → add the shop's courier accounts → Products → Purchases (lines with location) → stock appears.

**F2 — Delivery order (owner or admin):**
1. Type the phone. The system normalises it to +94 and shows the customer if known. **Warnings** show (returned before, flagged risky), but never block.
2. Fill in name, address and city, add items (default price, editable), delivery fee, discount and payment method.
3. Save. In one transaction, stock goes down at the seller's location. If there isn't enough, you get a clear error and nothing is saved. The order number is `SHOPCODE-000001`. Status is **Awaiting confirmation**. If the customer has an email, the e-bill email is queued.
4. Confirmation call → **Confirm** → status **Processing**.
5. **Pack** (no more edits) → print the invoice and label.
6. **Dispatch:** choose a courier account (the seller's own), type the tracking number, and optionally the courier charge → the tracking link is built → SMS and email are queued.
7. **Deliver**, or **Return** (reason required; enter good and damaged qty per line → good items go back to stock at the seller's location; optional return charge).
8. **Record payment** (COD remitted, or prepaid with a slip) → payment **Paid** → a ledger entry goes to the seller's side.

**F3 — Walk-in sale:** items + payment method → status **Completed (walk-in)**, paid. No delivery fee and no messages.

**F4 — Cancel:** allowed up to Packed. A reason is required and stock goes back.

**F5 — End of contract:** admin records a stock handover (remaining stock leaves the system, by location) → closes the shop → the owner keeps read-only access.

**F6 — Switch stock mode (admin):** to *by location*, enter how much of each product is at Gloma and how much at the shop (it must add up to the current total). To *single*, everything merges into one pool.

## Edge cases
| Case | Behaviour | Tag |
|---|---|---|
| Two people sell the last unit | Row lock; the second gets "Only 0 left at this location". No partial save. | P1 M |
| Price changed while the form was open | The order keeps the price that was submitted (a snapshot). The product price change doesn't touch existing orders. | P1 M |
| Two people edit the same order | Every update sends `version`. A mismatch returns 409 "Changed by someone else, reload". | P1 M |
| Action not allowed in the current status | 409 with a plain message. The UI only shows allowed actions anyway. | P1 M |
| Shop suspended | The owner gets 403 "Shop suspended". Admin can still work in it. | P1 M |
| Shop closed | Read-only for everyone except the admin's money and stock entries. | P1 M |
| By-location mode, seller's location empty | Can't sell, even if the other location has stock (stops a courier going to an empty place). | P1 M |
| SMS or email fails | Logged as failed with the error. Retried 3 times. Never blocks the order. | P1 M |
| Customer has no email | Skip the email. SMS only on dispatch. | P1 M |
| Bad phone number | 422 "Enter a valid Sri Lankan mobile number". | P1 M |
| Empty lists | Endpoints return `data: []`, and the UI shows a one-line hint plus the main action. | P1 M |
| Return after payment | Order shows a **Refund** action; the refund is a negative ledger entry. | P1 S |
| Product deactivated | Hidden from new orders. Existing orders unchanged. | P1 M |

## Non-functional
| Need | Target | Tag |
|---|---|---|
| Speed | List APIs under 300 ms at 10k orders per shop (indexed, paginated 25) | P1 M |
| Devices | API is device-agnostic; UI works on a phone and a desktop | P1 M |
| Security | Sanctum cookie auth, CSRF, login throttle, permission checks on every endpoint, tenant global scope, secrets in `.env` only, private slip storage | P1 M |
| Privacy (PDPA) | Audit log, per-shop customer data, retention command (5 years, ASSUMED), privacy notice link in config | P1 M |
| Accessibility | UI handover asks for WCAG AA basics (labels, contrast, keyboard) | P1 S |
| SEO | Not needed (private app, `noindex`) | — |
| Reliability | Health endpoint; the queue survives on shared hosting through cron | P1 M |
