import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderDetailPage } from '@/features/orders/OrderDetailPage'
import * as orderApi from '@/api/orders'
import type { Order } from '@/api/types'

vi.mock('@/api/orders', () => ({
  getOrder: vi.fn(),
  confirmOrder: vi.fn(),
  packOrder: vi.fn(),
  addOrderNote: vi.fn(),
}))

vi.mock('@/api/settings', () => ({
  getCourierAccounts: vi.fn().mockResolvedValue([]),
  getPaymentMethods: vi.fn().mockResolvedValue([]),
}))

const baseOrder: Order = {
  id: 42,
  number: 'ORD-00042',
  version: 1,
  channel: { value: 'facebook', label: 'Facebook' },
  seller: { value: 'shop', label: 'Shop Direct' },
  status: { value: 'pending', label: 'Pending', tone: 'warning' },
  payment_status: { value: 'unpaid', label: 'Unpaid', tone: 'danger' },
  available_actions: ['confirm', 'cancel'],
  warnings: [],
  placed_by: { id: 1, name: 'Admin' },
  customer: {
    id: 10,
    name: 'Kamal Perera',
    phone: '+94771234567',
    phone_local: '0771234567',
    email: null,
    address: '123 Galle Rd',
    city: 'Colombo',
  },
  items: [
    {
      id: 1,
      product_id: 10,
      name: 'Cotton T-Shirt',
      sku: 'TS-01',
      location: { value: 'store', label: 'Store' },
      qty: 1,
      unit_price: '2500.00',
      line_total: '2500.00',
      returned_good_qty: 0,
      returned_damaged_qty: 0,
    },
  ],
  payment_method: {
    id: 1,
    name: 'Cash on Delivery',
    kind: { value: 'cod', label: 'Cash on Delivery' },
    requires_slip: false,
  },
  totals: {
    subtotal: '2500.00',
    discount: '0.00',
    delivery_fee: '350.00',
    total: '2850.00',
  },
  shipping: {
    courier: null,
    courier_account: null,
    tracking_number: null,
    tracking_url: null,
    courier_charge: null,
  },
  cancel_reason: null,
  return_reason: null,
  return_charge: null,
  payments: [],
  timeline: [],
  notes: [],
  dates: {
    created_at: '2026-10-16T10:00:00Z',
    confirmed_at: null,
    packed_at: null,
    dispatched_at: null,
    delivered_at: null,
    returned_at: null,
    cancelled_at: null,
    paid_at: null,
  },
}

function renderOrderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/shops/1/orders/42']}>
        <Routes>
          <Route path="/shops/:shopId/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrderDetailPage available actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only the actions present in order.available_actions', async () => {
    vi.mocked(orderApi.getOrder).mockResolvedValue({
      ...baseOrder,
      available_actions: ['confirm', 'cancel'],
    })

    renderOrderDetail()

    // Header order number should be present
    expect(await screen.findByText('ORD-00042')).toBeInTheDocument()

    // Confirm and Cancel buttons MUST be rendered
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

    // Pack, Hand to Courier, Mark Delivered, Record Payment should NOT be rendered
    expect(screen.queryByRole('button', { name: /pack order/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hand to courier/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark delivered/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark returned/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /refund/i })).not.toBeInTheDocument()
  })

  it('renders pack and cancel buttons when order is confirmed', async () => {
    vi.mocked(orderApi.getOrder).mockResolvedValue({
      ...baseOrder,
      status: { value: 'confirmed', label: 'Confirmed', tone: 'info' },
      available_actions: ['pack', 'cancel'],
    })

    renderOrderDetail()

    expect(await screen.findByText('ORD-00042')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /pack order/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
  })

  it('renders no state transition buttons when available_actions is empty', async () => {
    vi.mocked(orderApi.getOrder).mockResolvedValue({
      ...baseOrder,
      status: { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
      available_actions: [],
    })

    renderOrderDetail()

    expect(await screen.findByText('ORD-00042')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pack/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /courier/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })
})
