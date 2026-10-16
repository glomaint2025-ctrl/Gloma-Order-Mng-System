# API contract — `/api/v1`

The source of truth is `backend/routes/api.php` + `app/Http/Resources/*`, and the shape is guarded by `tests/Feature/ContractTest.php`. Changing anything here is a **contract change** (see CLAUDE.md).

## Conventions
- **Auth:** Sanctum SPA cookies. First `GET /sanctum/csrf-cookie`, then send the `X-XSRF-TOKEN` header (axios does it automatically with `withCredentials: true` + `withXSRFToken: true`). The same domain is used in production; in dev, the Vite dev server proxies `/api` and `/sanctum` to Laravel.
- **Money** is a string with 2 decimals (`"1250.00"`), always LKR. Never do float maths in the UI; display only (and add up for a draft-total preview).
- **Qty** is an integer. **Dates** are ISO-8601 in Asia/Colombo (`2026-10-16T18:29:30+05:30`). Date filters are `YYYY-MM-DD`.
- **Enums** come as `{ value, label }` (statuses also have `tone`: `success|warning|danger|info|primary|neutral`). `GET /meta` lists all of them. Show `label`; never hard-code labels.
- **Single:** `{ data: {...} }`. **List:** `{ data: [...], links, meta: { current_page, last_page, per_page, total } }`. Lists take `?page=` and `?per_page=`.
- **Errors**

| Status | Body | Meaning | UI |
|---|---|---|---|
| 401 | `{message}` | not logged in | go to the login page |
| 403 | `{message, code?}` | not allowed (`shop_suspended`, `not_your_order`, `forbidden`) | show the message |
| 404 | `{message}` | not found, or another shop's row | "Not found" page |
| 409 | `{message, code}` | business rule (`insufficient_stock`, `invalid_transition`, `stale_version`, `shop_closed`, …) | toast the message; on `stale_version` reload the order |
| 419 | — | CSRF token expired | refetch `/sanctum/csrf-cookie` and retry once |
| 422 | `{message, errors?: {field: [msg]}, code?}` | validation (field errors), or a rule tied to input (`code`) | show under the fields; otherwise toast |
| 429 | `{message, code}` | too many login attempts | show the message |

## Auth & meta
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/sanctum/csrf-cookie` | — | 204 + cookie |
| POST | `/auth/login` | `{email, password, remember?}` | **Me** (see below) |
| POST | `/auth/logout` | — | `{message}` |
| GET | `/auth/me` | — | **Me** |
| POST | `/auth/password` | `{current_password, password, password_confirmation}` | `{message}` |
| GET | `/meta` | — | all enums, couriers, placeholders, currency, timezone, privacy_notice_url |
| GET | `/health` | — | `{status, database, queue{pending,failed}, cron_last_run, version, time}` (public) |

**Me** = `{ data: { user: User, is_admin, permissions: string[], shops: [{id, name, code, status, stock_mode, can_open}] } }`
Permission names: `shops.manage users.manage couriers.manage templates.manage_global audit.view admin.reports products.manage stock.manage ledger.manage` (admin) · `orders.place orders.manage payments.record customers.manage shop.settings reports.view` (both).

## Inside a shop — prefix `/shops/{shop}`
The user must be an admin or an owner of the shop; otherwise 404. Owners of a suspended shop get 403 `shop_suspended`. A closed shop is read-only for owners (409 `shop_closed` on writes).

### Dashboard & reports
| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/dashboard` | `from, to` (default: this month) | `{period, stock{units,value,by_location{shared/gloma/shop},low_stock}, investment{received_from_shop,spent_on_stock,unspent,gloma_fees,paid_out}, sales{gloma{orders,units,revenue}, shop{…}}, open_orders{awaiting_confirmation,processing,packed,dispatched}, cod_outstanding{gloma{orders,amount}, shop{…}}, balances{gloma,shop}, returns}` |
| GET | `/reports/sales` | `from, to` | `{period, products:[{product_id,sku,name,bought_qty,bought_cost,sold{gloma{qty,revenue},shop{qty,revenue}},revenue,cogs,gross_profit,returned_qty,damaged_qty,in_stock}], by_seller, totals{items_revenue,discounts,net_revenue,cost_of_goods_sold,delivery_fees_collected,courier_charges,return_charges,gross_profit}, note}` |
| GET | `/ledger` | `party, type, from, to` | LedgerEntry list + `summary{by_type:[{party,type,total}], balances{gloma,shop}}` |
| POST | `/ledger` ★ | `{type: shop_payment|gloma_fee|payout|adjustment, amount, party? (adjustment only, required), description, occurred_on?}` | LedgerEntry (201) |
| GET | `/messages` | `month=YYYY-MM, channel, status` | MessageLog list + `summary{month,sms_sent,sms_segments,sms_cost,failed}` |

### Products, stock, purchases (★ = Gloma admin only)
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/products` | `search, active, per_page` | Product list |
| GET | `/products/{id}` | — | Product |
| POST ★ | `/products` | `{sku, name, description?, price}` | Product (201) |
| PATCH ★ | `/products/{id}` | any of `sku,name,description,price,is_active` | Product |
| GET | `/stock/movements` | `product_id, type, location` | StockMovement list (newest first) |
| POST ★ | `/stock/adjustments` | `{product_id, type: correction|damage|handover, qty (±, only correction keeps the sign), location?, reason}` | StockMovement (201) |
| POST ★ | `/stock/transfers` | `{product_id, from: gloma|shop, to, qty, reason?}` (by-location mode only) | `{data: Product}` (201) |
| POST ★ | `/stock/mode` | `{stock_mode: single|by_location, split?: [{product_id, gloma, shop}]}` (each split must add up to the current total; default is all at Gloma) | Shop |
| GET | `/purchases` | — | Purchase list (`lines_count`) |
| GET | `/purchases/{id}` | — | Purchase with `lines` |
| POST ★ | `/purchases` | `{reference?, supplier?, purchased_on, notes?, lines:[{product_id, qty, unit_cost, location?}]}` | Purchase (201) |

### Orders
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/orders` | `status, payment_status, seller, channel, search (number/name/phone/tracking), from, to, needs_action=1, per_page` | OrderListItem list |
| POST | `/orders` | see **OrderInput** | Order (201) |
| GET | `/orders/{id}` | — | Order |
| PATCH | `/orders/{id}` | OrderInput + `version` | Order · 409 `stale_version` |
| POST | `/orders/{id}/confirm` | — | Order |
| POST | `/orders/{id}/pack` | — | Order |
| POST | `/orders/{id}/dispatch` | `{courier_account_id, tracking_number, courier_charge?}` | Order (SMS + email queued) |
| POST | `/orders/{id}/deliver` | `{record_payment?: bool, reference?}` | Order |
| POST | `/orders/{id}/cancel` | `{reason}` | Order |
| POST | `/orders/{id}/return` | `{reason, return_charge?, items?: [{order_item_id, damaged_qty}]}` (missing lines count as all good) | Order |
| POST | `/orders/{id}/payments` | multipart: `payment_method_id?, reference?, slip? (jpg/png/pdf/webp ≤5 MB)` | Order · 422 `slip_required` |
| POST | `/orders/{id}/refund` | `{reference?}` | Order |
| GET | `/orders/{id}/payments/{paymentId}/slip` | — | the file |
| POST | `/orders/{id}/notes` | `{body}` | OrderNote (201) |
| GET | `/orders/{id}/invoice.pdf` · `/orders/{id}/label.pdf` | — | PDF (open in a new tab) |
| POST | `/orders/print` | `{type: invoice|label, order_ids: []}` | one PDF (blob) |

**OrderInput**
```json
{
  "channel": "delivery | walk_in",            // create only; ignored on edit
  "payment_method_id": 1,
  "customer": { "phone": "0771234567", "name": "…", "email": null, "address": "…", "city": "…" }, // required for delivery; optional for walk_in
  "items": [{ "product_id": 1, "qty": 2, "unit_price": "2500.00" }],   // unit_price optional = product price
  "delivery_fee": "350.00",                  // forced to 0 for walk_in
  "discount": "0.00",
  "note": "optional first note"              // create only
}
```

**Order** (full): `id, number, version, channel, seller, status{value,label,tone}, payment_status{…tone}, available_actions[], warnings[{code,level,message}], placed_by{id,name}, customer{id,name,phone,phone_local,email,address,city}, items[{id,product_id,sku,name,location,qty,unit_price,line_total,returned_good_qty,returned_damaged_qty}], payment_method{id,name,kind,requires_slip}, totals{subtotal,discount,delivery_fee,total}, shipping{courier,courier_account,tracking_number,tracking_url,courier_charge}, cancel_reason, return_reason, return_charge, payments[{id,kind,amount,method,reference,has_slip,paid_at}], timeline[{id,type,label,to_status,meta,user,created_at}], notes[{id,body,user,created_at}], dates{created_at,confirmed_at,packed_at,dispatched_at,delivered_at,returned_at,cancelled_at,paid_at}`

**available_actions** values → button → endpoint:
`edit`→Edit→PATCH · `confirm`→"Confirm (called customer)"→/confirm · `pack`→Pack→/pack · `dispatch`→"Hand to courier"→/dispatch · `deliver`→"Mark delivered"→/deliver · `return`→"Mark returned"→/return · `cancel`→Cancel→/cancel · `record_payment`→"Record payment"→/payments · `refund`→Refund→/refund · `add_note`→note box · `print_invoice`, `print_label`→PDF links.

**OrderListItem:** `id, number, channel, seller, status, payment_status, customer_name, customer_phone_local, delivery_city, items_count, total, tracking_number, has_warning, created_at`

### Customers
| Method | Path | Query / body | Returns |
|---|---|---|---|
| GET | `/customers` | `search (name/phone), with_warning=1` | Customer list (`has_warning`; no `warnings` in lists) |
| GET | `/customers/lookup` | `phone` | `{phone, phone_local, customer: Customer|null, warnings[]}`, used while typing on the order form · 422 `invalid_phone` |
| GET | `/customers/{id}` | — | `{customer (with warnings), recent_orders: OrderListItem[]}` |
| PATCH | `/customers/{id}` | `name,email,address,city,is_risky,risk_note` | Customer (with warnings) |

### Settings (admin + owner)
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/payment-methods` | `active_only=1` | PaymentMethod[] `{id,name,kind,requires_slip,is_active}` |
| POST / PATCH | `/payment-methods[/{id}]` | `{name, kind: cod|prepaid, requires_slip?, is_active?}` | PaymentMethod |
| GET | `/courier-accounts` | `active_only=1`, `for=gloma` (Gloma's accounts, for dispatching Gloma orders) | CourierAccount[] `{id, owner, courier{id,code,name}, label, account_ref, default_charge, is_active}` |
| POST / PATCH | `/courier-accounts[/{id}]` | `{courier_id, label, account_ref?, default_charge?, is_active?}` | CourierAccount |
| GET | `/templates` | — | `[{event, channel, uses: shop|global, shop_template, global_template}]` + `placeholders` |
| PUT | `/templates` | `{event, channel, subject?, body, is_active?}` | MessageTemplate (shop override, 200) |
| DELETE | `/templates` | `{event, channel}` | back to the default |

## Gloma admin — prefix `/admin` (403 for owners)
| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/admin/dashboard` | `from, to` | `{period, totals{stock_value,revenue_gloma,revenue_shop,cod_outstanding,open_orders}, shops:[{shop, stock_units, stock_value, low_stock, sales, open_orders, cod_outstanding}]}` |
| GET | `/admin/sms-usage` | `month` | `{month, cost_per_segment, shops:[{shop, sent, failed, segments, cost}], total_cost}` |
| GET / POST | `/admin/shops` | list: `search, status` · create: shop fields + `owner: {user_id}` or `{name, email, password, phone?}` | Shop (`owners[]`) |
| GET / PATCH | `/admin/shops/{id}` | `name, contract_ref, contract_started_on, phone, email, address, notes` | Shop |
| POST | `/admin/shops/{id}/status` | `{status: active|suspended|closed}` | Shop |
| POST / DELETE | `/admin/shops/{id}/owners[/{userId}]` | add: `{user_id}` or new owner fields | User / `{message}` (409 `last_owner`) |
| GET / POST | `/admin/users` | list: `role, search` · create: `{name, email, password, phone?, role: gloma_admin|shop_owner}` | User |
| GET / PATCH | `/admin/users/{id}` | `name, email, phone, is_active, password` (password = reset) | User |
| GET / PATCH | `/admin/couriers[/{id}]` | `name, tracking_url_template (must contain {tracking}), is_active` | Courier |
| GET / POST / PATCH | `/admin/courier-accounts[/{id}]` | Gloma's own accounts | CourierAccount |
| GET / PUT | `/admin/templates` | global defaults `{event, channel, subject?, body, is_active?}` | MessageTemplate |
| GET | `/admin/audit-logs` | `shop_id, user_id, action (prefix), from, to` | AuditLog list |

## Other resources
- **User:** `id, name, email, phone, is_active, role{value,label}, shops?[{id,name,code}], last_login_at`
- **Shop:** `id, name, code, status, stock_mode, is_read_only, contract_ref, contract_started_on, phone, email, address, notes (admin only), owners?, created_at`
- **Product:** `id, sku, name, description, price, avg_cost, is_active, stock{total, by_location:[{location, qty}]}` (locations follow the shop's stock mode)
- **StockMovement:** `id, product{id,sku,name}, location, qty (±), type, reason, source{type,id}|null, user{id,name}, created_at`
- **Purchase:** `id, reference, supplier, purchased_on, total, notes, lines_count?, lines?[{id, product, location, qty, unit_cost, line_total}], created_by, created_at`
- **Customer:** `id, name, phone, phone_local, email, address, city, is_risky, risk_note, orders_count, returns_count, has_warning, warnings? (detail only), created_at`
- **LedgerEntry:** `id, party, type, amount (signed), direction in|out, order{id,number}|null, stock_purchase_id, description, occurred_on, created_by, created_at`
- **MessageLog:** `id, order_id, event, channel, recipient, body, segments, cost, status queued|sent|failed|skipped, error, created_at`
- **MessageTemplate:** `id, scope global|shop, event, channel, subject, body, is_active, sms_segments`
- **AuditLog:** `id, action, user, shop, subject{type,id}, changes, ip, created_at`
