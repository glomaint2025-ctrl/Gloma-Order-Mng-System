import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderFormPage } from '@/features/orders/OrderFormPage'
import * as customerApi from '@/api/customers'

vi.mock('@/api/customers', () => ({
  lookupCustomer: vi.fn(),
}))

vi.mock('@/api/products', () => ({
  getProducts: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        shop_id: 1,
        name: 'Test Product',
        sku: 'TP-1',
        price: '1500.00',
        is_active: true,
        has_variants: false,
        stock: { total: 10, by_location: { store: 10 } },
        created_at: '2026-10-16T10:00:00Z',
        updated_at: '2026-10-16T10:00:00Z',
      },
    ],
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 25,
      total: 1,
    },
  }),
}))

vi.mock('@/api/settings', () => ({
  getPaymentMethods: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Cash on Delivery',
      kind: { value: 'cod', label: 'Cash on Delivery' },
      is_active: true,
      requires_slip: false,
    },
  ]),
}))

function renderOrderForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/shops/1/orders/new']}>
        <Routes>
          <Route path="/shops/:shopId/orders/new" element={<OrderFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrderFormPage customer lookup & warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays customer warnings non-blockingly upon phone lookup', async () => {
    const user = userEvent.setup()

    vi.mocked(customerApi.lookupCustomer).mockResolvedValue({
      phone: '+94771234567',
      phone_local: '0771234567',
      customer: {
        id: 99,
        name: 'Sunil Silva',
        phone: '+94771234567',
        phone_local: '0771234567',
        email: 'sunil@example.com',
        address: '45 Lake Rd',
        city: 'Colombo',
        is_risky: true,
        risk_note: 'Frequent returns',
        orders_count: 5,
        returns_count: 3,
        has_warning: true,
        created_at: '2026-10-16T10:00:00Z',
      },
      warnings: [
        {
          code: 'high_return_rate',
          level: 'warning',
          message: 'Customer has a high return rate (60%). Verify order before dispatch.',
        },
      ],
    })

    renderOrderForm()

    // Find phone input
    const phoneInput = screen.getByLabelText(/phone number/i)
    await user.type(phoneInput, '0771234567')

    // Wait for debounced lookup
    await waitFor(() => {
      expect(customerApi.lookupCustomer).toHaveBeenCalledWith(1, '0771234567')
    })

    // Warning banner should be rendered
    expect(
      await screen.findByText(/Customer has a high return rate \(60%\)\. Verify order before dispatch\./i)
    ).toBeInTheDocument()

    // Customer name should auto-populate
    const nameInput = screen.getByLabelText(/customer full name/i)
    expect(nameInput).toHaveValue('Sunil Silva')

    // The submit button must still be available (not blocked / disabled)
    const submitBtn = screen.getByRole('button', { name: /create order/i })
    expect(submitBtn).toBeInTheDocument()
    expect(submitBtn).not.toBeDisabled()
  })
})
