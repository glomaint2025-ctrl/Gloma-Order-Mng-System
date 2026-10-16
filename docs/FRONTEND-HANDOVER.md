# Frontend handover prompt — Gloma Shop Portal

> Copy everything below the line into a new Claude Code session opened at the repo root (`C:\Gloma\Tenent-Biz-System`).

---

You are building the **frontend** of the Gloma Shop Portal. The **backend is finished and tested** (Laravel 12 API in `backend/`, 94 passing tests). Do **not** change backend code. If the API seems to need a change, stop and tell me, because it's a contract change (CLAUDE.md).

## Read first (in this order)
1. `CLAUDE.md`: repo rules (no pushing, private git identity, quality bar).
2. `docs/00-CONTEXT.md` and `docs/DECISIONS.md`: what the business is and why.
3. `docs/03-FEATURES.md`: every screen, flow and edge case.
4. `docs/API.md`: **the contract**. Every endpoint, body and response field.
5. Skim `backend/routes/api.php` and `backend/app/Http/Resources/*` when a detail in API.md is unclear.

## What the product is (short)
A back-office portal (no storefront) for shops that partner with Gloma. Gloma invests in stock for a shop. Both **Gloma admin** and the **shop owner** sell from one stock pool, ship with their own courier accounts, and the system tracks orders, returns, COD, money and reports. Two roles only: `gloma_admin` and `shop_owner`. An owner may have several shops and switches between them. Currency is LKR; timezone Asia/Colombo; users are in Sri Lanka and often work on phones.

## UI principles (most important — the owner insisted)
- **Minimal and very easy to understand.** Plain words, few fields, one main action per screen, generous spacing, nothing clever.
- **The server decides, the UI shows.** Never put business rules in the UI:
  - Show order buttons **only** from `available_actions`.
  - Show labels and badge colours from `{value,label,tone}`. Map `tone` to colours: success = green, warning = amber, danger = red, info = blue, primary = indigo, neutral = gray.
  - Show `warnings[]` as an amber or red banner (`level`), and never block the user.
  - Get enums and labels from `GET /api/v1/meta` (cache them for the session).
- Money comes as strings like `"1250.00"`. Format it for display as `Rs 1,250.00`. Never do float maths. A live draft-total preview on the order form is fine (use integer cents), but the saved totals always come from the server.
- Phone-first responsive layout: a sidebar on desktop and a bottom bar or drawer on mobile. Tables become cards on small screens.
- Every list has an empty state: one sentence plus the main action button. Every mutation shows a loading state and a toast with the server's `message`.
- Accessibility basics (WCAG AA): labels on all inputs, focus states, keyboard-usable dialogs, colour plus text (not colour alone).
- Polling, not push: the orders list and dashboard refetch every 30–60 s (`refetchInterval`). No WebSockets.

## Stack (use exactly this unless there's a strong reason)
- React 19 + TypeScript (strict) + Vite, **pnpm**.
- React Router (data router), TanStack Query, axios.
- react-hook-form + zod for forms.
- Tailwind CSS v4 + small hand-made components in `src/components/ui` (Button, Input, Select, Dialog, Badge, Table/Card list, Toast, EmptyState, Money, Spinner). shadcn/ui-style is fine; keep it light. lucide-react icons.
- Vitest + Testing Library + **MSW** (tests never call the real network).
- ESLint + Prettier.

`frontend/package.json` **must** have these scripts, because CI already calls them: `typecheck` (`tsc --noEmit`), `lint`, `test` (`vitest run`), `build`.

## Project setup
- Create `frontend/` at the repo root.
- `vite.config.ts`:
  - `base: '/app/'`
  - `build.outDir: '../backend/public/app'`, `emptyOutDir: true`. Laravel serves `public/app/index.html` for every non-API path (see `backend/routes/web.php`).
  - Dev server port 5173 with `proxy: { '/api': 'http://localhost:8000', '/sanctum': 'http://localhost:8000' }`.
- `BrowserRouter` with no basename (Laravel serves index.html at `/`, `/orders`, and so on; only the assets live under `/app/`).
- Add `backend/public/app/` to `backend/.gitignore` (CI builds it during deploy).

### Running the backend locally
```bash
cd backend
cp .env.example .env   # if no .env yet
php artisan key:generate
php artisan migrate:fresh --seed --seeder=DemoSeeder
php artisan serve      # http://localhost:8000
```
Composer is at `tools/composer.phar` (`php ../tools/composer.phar install`); download it again from getcomposer.org if it's missing. Demo logins (password `password`): **admin@gloma.test** (Gloma admin), **owner@gloma.test** (owner of shop "Demo Fashion Store", id 1). `.env` must have `SANCTUM_STATEFUL_DOMAINS` including `localhost:5173`.

## API client rules
- axios instance: `baseURL: '/api/v1'`, `withCredentials: true`, `withXSRFToken: true`, `headers: { Accept: 'application/json' }`.
- On app start: `GET /sanctum/csrf-cookie` (once), then `GET /auth/me`. 401 → login page.
- Login: `POST /auth/login {email, password}` → returns Me.
- Error interceptor:
  - 401 → clear the cache, go to login.
  - 419 → refetch the CSRF cookie and retry once.
  - 422 with `errors` → set field errors in the form; 422 or 409 with `code` → toast `message`.
  - 403 → toast `message`.
  - 404 → a not-found view.
  - 409 `stale_version` → toast and refetch the order.
- Put **all TypeScript types in `src/api/types.ts`, written from docs/API.md**. One file per area with typed functions (`src/api/orders.ts`, …). Query keys always include the shop id.
- PDFs:
  - Single invoice or label: open `/api/v1/shops/{id}/orders/{orderId}/invoice.pdf` in a new tab.
  - Bulk: `POST /orders/print` with `responseType: 'blob'`, then open the blob URL.

## App structure
```
src/
  api/            client.ts, types.ts, auth.ts, meta.ts, orders.ts, products.ts, stock.ts, customers.ts, finance.ts, settings.ts, admin.ts
  app/            router.tsx, providers.tsx, layout/ (AppShell, Sidebar, ShopSwitcher, Topbar)
  components/ui/  small reusable pieces
  features/
    auth/         LoginPage
    shops/        ShopPickerPage (owners with >1 shop; admin shop list)
    dashboard/    ShopDashboardPage
    orders/       OrdersListPage, OrderFormPage (new/edit), WalkInPage, OrderDetailPage, action dialogs
    products/     ProductsPage, ProductForm (admin)
    stock/        StockPage (levels + movements), AdjustDialog, TransferDialog, StockModeDialog (admin)
    purchases/    PurchasesPage, PurchaseForm (admin), PurchaseDetail
    customers/    CustomersPage, CustomerDetailPage
    money/        LedgerPage, LedgerEntryDialog (admin), ReportsPage
    settings/     PaymentMethods, CourierAccounts, Templates, Messages (SMS log)
    admin/        AdminDashboard, ShopsAdmin, ShopForm, UsersAdmin, CouriersAdmin, GlomaCourierAccounts, GlobalTemplates, SmsUsage, AuditLog
  lib/            money.ts (format, cents), phone.ts (display only), date.ts, permissions.ts (`can('stock.manage')` from Me)
```
Routes: `/login`, `/` (redirect: admin → `/admin`; owner with one shop → `/shops/:id`; otherwise the picker), `/shops/:shopId/{dashboard,orders,orders/new,orders/walk-in,orders/:orderId,orders/:orderId/edit,products,stock,purchases,customers,customers/:id,money,reports,settings}`, `/admin/{dashboard,shops,shops/new,shops/:id,users,couriers,templates,sms-usage,audit}`.
Hide menu items the user lacks permission for (from `me.permissions`). The server enforces permissions anyway.

## Screens (what each must do; endpoints are in docs/API.md)

**Login**: email, password, "Log in". Show the throttle message on 429.

**Shop switcher**: in the top bar, shows the current shop name and lets the user switch (owners with >1 shop, and admins). A shop with `can_open=false` (suspended) is shown greyed out with its status label. A closed shop shows a "Read-only" badge everywhere.

**Shop dashboard** (`GET /dashboard`): cards for:
- **Orders to act on** (awaiting confirmation / processing / packed / dispatched; click → filtered list)
- **Stock** (units, value, by location, low stock)
- **Sales this month** (Gloma vs shop: orders, units, revenue)
- **COD outstanding**
- **Money invested** (received / spent / unspent)
- **Returns**

Date range picker (this month by default). Poll every 60 s. No charts needed in phase 1; numbers first.

**Orders list** (`GET /orders`):
- Search box (number, name, phone, tracking).
- Filter chips: Needs action · Status · Payment · Placed by (Gloma/Shop) · Delivery/Walk-in · date range.
- Rows: number, customer + city, total, status badge, payment badge, seller, ⚠ icon when `has_warning`.
- Checkbox selection → "Print labels" / "Print invoices" (bulk PDF).
- Buttons: "New order", "Walk-in sale". Poll every 30 s.

**New / edit order** (one page):
1. **Phone first:** debounced `GET /customers/lookup?phone=` → prefill name/address/city/email and show `warnings` as a banner (never block). Show 422 `invalid_phone` inline.
2. Customer fields.
3. Items: product search select (`GET /products?active=1`). Show the stock available next to each product (`stock.total`, or the user's own location when the shop is by-location). qty, unit price (prefilled, editable).
4. Delivery fee, discount, payment method (`GET /payment-methods?active_only=1`), optional note.
5. A live total preview, then "Save order".

On edit, send `version`. On 409 `insufficient_stock`, show the message next to the items.

**Walk-in sale**: a short form: items, payment method, optional phone and name. Saves as Completed + Paid.

**Order detail** (`GET /orders/{id}`), top to bottom:
- Header: number, status badge, payment badge, seller, placed by.
- Warnings banner.
- **Action buttons from `available_actions` only**, primary action first, in the order: confirm/pack/dispatch/deliver/record_payment, then edit, cancel, return, refund, print.
- Customer card (call link `tel:`), items table, totals, shipping (courier, tracking number, **tracking link**), payments (slip link), timeline (label, who, when), notes (list + add box).

Dialogs:
- **Dispatch:** courier account select. Use `GET /courier-accounts?active_only=1`, adding `&for=gloma` when `seller.value==='gloma'`. Tracking number (required), courier charge (prefill `default_charge`).
- **Deliver:** checkbox "Payment collected now" → `record_payment: true`.
- **Cancel:** reason (required).
- **Return:** reason (required), per line "damaged qty" (default 0), optional return charge.
- **Record payment:** method (default = the order's), reference, and a slip upload when the method `requires_slip` (multipart).
- **Refund:** reference.

**Products** (admin edits; owner views): list with stock per location; create and edit dialog (sku, name, price, description, active toggle).

**Stock**:
- Levels table: product × locations.
- Movements list with filters (product, type, location); show qty with a +/− sign and colour.
- Admin buttons: Adjust (type: correction / damage / handover; qty; location when by-location; reason), Transfer (by-location only), Switch stock mode (a dialog that asks for the Gloma/shop split per product, which must add up to the total; show the running check).

**Purchases**: list (date, reference, supplier, total, lines). Admin "Record purchase" form: date, reference, supplier, lines (product, qty, unit cost, location when by-location), live total. Detail view.

**Customers**: search list with ⚠ for `has_warning` and the "With warnings" filter. Detail: contact info, counts, warnings, a "Flag as risky" toggle + note, recent orders.

**Money** (`GET /ledger`): balances per side (Gloma / Shop), totals by type, and an entries list (date, type, side, description, amount in green or red, linked order). Admin "Add entry": type (money received from shop / Gloma fee / payout / adjustment), amount, side (adjustment only), description, date.

**Reports** (`GET /reports/sales`): date range → totals card (revenue, COGS, delivery fees, courier charges, return charges, **gross profit**) and a products table (bought qty/cost, sold by Gloma, sold by shop, revenue, COGS, gross profit, returned, damaged, in stock). Show the `note` text. **Never show "expected" or forecast numbers** (legal rule).

**Settings** (tabs):
- Payment methods (name, COD or prepaid, requires slip, active).
- Courier accounts (courier, label, account ref, default charge, active).
- Message templates: for each event and channel, the shop's text or "Using default". Edit with a placeholder helper (`placeholders`) and a **live SMS segment counter** (GSM-7 = 160 chars, 153 per part; any non-GSM character such as Sinhala = 70, 67 per part). "Reset to default".
- SMS log (`GET /messages?month=`) with the month's summary.

**Admin area**:
- Dashboard: totals + a per-shop table → click opens the shop.
- Shops: list, create (shop fields + new owner name/email/password, or pick an existing owner), edit, status buttons (Suspend / Close / Reactivate, each with a confirm dialog), owners list (add / remove).
- Users: list (role filter), create (role), edit, reset password, deactivate.
- Couriers: edit the tracking URL pattern (must contain `{tracking}`; show an example link with "TEST123").
- Gloma courier accounts: list, create, edit.
- Global templates: same editor as the shop templates.
- SMS usage: month picker, per-shop table, total. Audit log: filters + a list with expandable `changes`.

## Quality bar (before you call any task done)
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass, and the build lands in `backend/public/app`.
- Tests:
  - the API client error handling
  - money formatting
  - the order form (lookup warnings shown, validation errors mapped)
  - order detail renders only `available_actions` buttons
  - the SMS segment counter

  Use MSW handlers built from docs/API.md examples.
- Manually check the main flow in the browser against the running backend: log in as owner, create an order, confirm, pack, dispatch, deliver + pay; then as admin, record a purchase and see the stock.
- Mobile width (375 px) works for login, orders list, order form and order detail.

## Working rules
- Commit with the private git identity already configured. **Never push** and never use the harmonycentermedia account.
- One feature per commit (Conventional Commits, e.g. `feat(orders): order detail page`).
- Suggested order:
  1. scaffold + tooling + API client + auth + layout + shop switcher
  2. orders list + order form + order detail + dialogs
  3. dashboard
  4. products / stock / purchases
  5. customers
  6. money + reports
  7. settings
  8. admin area
  9. polish (empty states, mobile, a11y)
- If something in the API is missing or awkward for a simple UI, list it for me instead of working around it.
