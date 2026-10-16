export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'

export interface EnumOption {
  value: string
  label: string
  tone?: Tone
}

export interface PaginatedResponse<T> {
  data: T[]
  links?: {
    first?: string
    last?: string
    prev?: string | null
    next?: string | null
  }
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface SingleResponse<T> {
  data: T
}

export interface ApiError {
  message: string
  code?: string
  errors?: Record<string, string[]>
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  is_active: boolean
  role: {
    value: 'gloma_admin' | 'shop_owner'
    label: string
  }
  shops?: {
    id: number
    name: string
    code: string
  }[]
  last_login_at: string | null
}

export interface ShopSummary {
  id: number
  name: string
  code: string
  status: EnumOption
  stock_mode: EnumOption
  can_open: boolean
}

export interface MeData {
  user: User
  is_admin: boolean
  permissions: string[]
  shops: ShopSummary[]
}

export interface Shop {
  id: number
  name: string
  code: string
  status: EnumOption
  stock_mode: EnumOption
  is_read_only: boolean
  contract_ref: string | null
  contract_started_on: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes?: string | null
  owners?: User[]
  created_at: string
}

export interface ProductStockLocation {
  location: EnumOption
  qty: number
}

export interface Product {
  id: number
  sku: string
  name: string
  description: string | null
  price: string
  avg_cost: string
  is_active: boolean
  stock: {
    total: number
    by_location: ProductStockLocation[]
  }
}

export interface StockMovement {
  id: number
  product?: {
    id: number
    sku: string
    name: string
  }
  location: EnumOption
  qty: number
  type: EnumOption
  reason: string | null
  source: {
    type: string
    id: number
  } | null
  user: {
    id: number
    name: string
  } | null
  created_at: string
}

export interface StockPurchaseLine {
  id: number
  product: {
    id: number
    sku: string
    name: string
  }
  location: EnumOption
  qty: number
  unit_cost: string
  line_total: string
}

export interface Purchase {
  id: number
  reference: string | null
  supplier: string | null
  purchased_on: string
  total: string
  notes: string | null
  lines_count?: number
  lines?: StockPurchaseLine[]
  created_by?: {
    id: number
    name: string
  } | null
  created_at: string
}

export interface OrderWarning {
  code: string
  level: 'warning' | 'danger'
  message: string
}

export interface Customer {
  id: number
  name: string
  phone: string
  phone_local: string
  email: string | null
  address: string | null
  city: string | null
  is_risky: boolean
  risk_note: string | null
  orders_count: number
  returns_count: number
  has_warning: boolean
  warnings?: OrderWarning[]
  created_at: string
}

export interface CustomerLookupResult {
  phone: string
  phone_local: string
  customer: Customer | null
  warnings: OrderWarning[]
}

export interface OrderItem {
  id: number
  product_id: number
  sku: string
  name: string
  location: EnumOption
  qty: number
  unit_price: string
  line_total: string
  returned_good_qty: number
  returned_damaged_qty: number
}

export interface OrderListItem {
  id: number
  number: string
  channel: EnumOption
  seller: EnumOption
  status: EnumOption
  payment_status: EnumOption
  customer_name: string
  customer_phone_local: string | null
  delivery_city: string | null
  items_count: number
  total: string
  tracking_number: string | null
  has_warning: boolean
  created_at: string
}

export interface OrderPayment {
  id: number
  kind: string
  amount: string
  method: string | null
  reference: string | null
  has_slip: boolean
  paid_at: string
}

export interface OrderTimelineEvent {
  id: number
  type: string
  label: string
  to_status: string | null
  meta: Record<string, unknown> | null
  user: {
    id: number
    name: string
  } | null
  created_at: string
}

export interface OrderNote {
  id: number
  body: string
  user: {
    id: number
    name: string
  } | null
  created_at: string
}

export interface Order {
  id: number
  number: string
  version: number
  channel: EnumOption
  seller: EnumOption
  status: EnumOption
  payment_status: EnumOption
  available_actions: string[]
  warnings: OrderWarning[]
  placed_by: {
    id: number
    name: string
  } | null
  customer: {
    id: number | null
    name: string | null
    phone: string | null
    phone_local: string | null
    email: string | null
    address: string | null
    city: string | null
  }
  items: OrderItem[]
  payment_method: {
    id: number
    name: string
    kind: EnumOption
    requires_slip: boolean
  } | null
  totals: {
    subtotal: string
    discount: string
    delivery_fee: string
    total: string
  }
  shipping: {
    courier: {
      id: number
      name: string
    } | null
    courier_account: {
      id: number
      label: string
    } | null
    tracking_number: string | null
    tracking_url: string | null
    courier_charge: string | null
  }
  cancel_reason: string | null
  return_reason: string | null
  return_charge: string | null
  payments: OrderPayment[]
  timeline: OrderTimelineEvent[]
  notes: OrderNote[]
  dates: {
    created_at: string
    confirmed_at: string | null
    packed_at: string | null
    dispatched_at: string | null
    delivered_at: string | null
    returned_at: string | null
    cancelled_at: string | null
    paid_at: string | null
  }
}

export interface OrderInput {
  channel?: 'delivery' | 'walk_in'
  payment_method_id: number
  customer?: {
    phone: string
    name: string
    email?: string | null
    address?: string | null
    city?: string | null
  } | null
  items: {
    product_id: number
    qty: number
    unit_price?: string | null
  }[]
  delivery_fee?: string
  discount?: string
  note?: string
  version?: number
}

export interface PaymentMethod {
  id: number
  name: string
  kind: EnumOption
  requires_slip: boolean
  is_active: boolean
}

export interface Courier {
  id: number
  code: string
  name: string
  tracking_url_template?: string
  is_active: boolean
}

export interface CourierAccount {
  id: number
  owner: EnumOption
  courier: {
    id: number
    code: string
    name: string
  }
  label: string
  account_ref: string | null
  default_charge: string | null
  is_active: boolean
}

export interface LedgerEntry {
  id: number
  party: EnumOption
  type: EnumOption
  amount: string
  direction: 'in' | 'out'
  order: {
    id: number
    number: string
  } | null
  stock_purchase_id: number | null
  description: string
  occurred_on: string
  created_by: {
    id: number
    name: string
  } | null
  created_at: string
}

export interface LedgerSummary {
  by_type: {
    party: EnumOption
    type: EnumOption
    total: string
  }[]
  balances: {
    gloma: string
    shop: string
  }
}

export interface DashboardData {
  period: {
    from: string
    to: string
  }
  stock: {
    units: number
    value: string
    by_location: Record<string, number>
    low_stock: number
  }
  investment: {
    received_from_shop: string
    spent_on_stock: string
    unspent: string
    gloma_fees: string
    paid_out: string
  }
  sales: Record<string, { orders: number; units: number; revenue: string }>
  open_orders: {
    awaiting_confirmation: number
    processing: number
    packed: number
    dispatched: number
  }
  cod_outstanding: Record<string, { orders: number; amount: string }>
  balances: {
    gloma: string
    shop: string
  }
  returns: number
}

export interface SalesReportProduct {
  product_id: number
  sku: string
  name: string
  bought_qty: number
  bought_cost: string
  sold: Record<string, { qty: number; revenue: string }>
  revenue: string
  cogs: string
  gross_profit: string
  returned_qty: number
  damaged_qty: number
  in_stock: number
}

export interface SalesReportData {
  period: {
    from: string
    to: string
  }
  products: SalesReportProduct[]
  by_seller: Record<string, { orders: number; units: number; revenue: string }>
  totals: {
    items_revenue: string
    discounts: string
    net_revenue: string
    cost_of_goods_sold: string
    delivery_fees_collected: string
    courier_charges: string
    return_charges: string
    gross_profit: string
  }
  note: string
}

export interface MessageTemplate {
  id: number
  scope: 'global' | 'shop'
  event: EnumOption
  channel: EnumOption
  subject: string | null
  body: string
  is_active: boolean
  sms_segments: number | null
}

export interface TemplateRow {
  event: EnumOption
  channel: EnumOption
  uses: 'shop' | 'global'
  shop_template: MessageTemplate | null
  global_template: MessageTemplate | null
}

export interface MessageLog {
  id: number
  order_id: number | null
  event: EnumOption
  channel: EnumOption
  recipient: string
  body: string
  segments: number
  cost: string
  status: 'queued' | 'sent' | 'failed' | 'skipped'
  error: string | null
  created_at: string
}

export interface AuditLog {
  id: number
  action: string
  user: {
    id: number
    name: string
  } | null
  shop: {
    id: number
    name: string
  } | null
  subject: {
    type: string
    id: number
  } | null
  changes: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export interface AdminDashboardData {
  period: {
    from: string
    to: string
  }
  totals: {
    stock_value: string
    revenue_gloma: string
    revenue_shop: string
    cod_outstanding: string
    open_orders: number
  }
  shops: {
    shop: {
      id: number
      name: string
      code: string
      status: EnumOption
    }
    stock_units: number
    stock_value: string
    low_stock: number
    sales: Record<string, { orders: number; units: number; revenue: string }>
    open_orders: number
    cod_outstanding: string
  }[]
}

export interface AdminSmsUsage {
  month: string
  cost_per_segment: string
  shops: {
    shop: {
      id: number
      name: string
      code: string
    }
    sent: number
    failed: number
    segments: number
    cost: string
  }[]
  total_cost: string
}

export interface MetaData {
  order_statuses: EnumOption[]
  payment_statuses: EnumOption[]
  order_channels: EnumOption[]
  parties: EnumOption[]
  stock_locations: EnumOption[]
  stock_modes: EnumOption[]
  shop_statuses: EnumOption[]
  movement_types: EnumOption[]
  manual_adjustment_types: EnumOption[]
  ledger_types: EnumOption[]
  manual_ledger_types: (EnumOption & { sign: number })[]
  payment_method_kinds: EnumOption[]
  message_events: EnumOption[]
  message_channels: EnumOption[]
  template_placeholders: string[]
  couriers: Courier[]
  currency: string
  timezone: string
  privacy_notice_url: string | null
}
