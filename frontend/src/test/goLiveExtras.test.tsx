import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '@/api/client'
import { eraseCustomer } from '@/api/customers'
import { downloadFile } from '@/api/download'
import { uploadProductImage } from '@/api/products'
import { SalesTrend } from '@/features/dashboard/SalesTrend'
import { ResetPasswordPage } from '@/features/auth/PasswordResetPages'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
})

function capture(respond: (config: InternalAxiosRequestConfig) => { data: unknown; headers?: Record<string, string> }) {
  const seen: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config)
    const { data, headers = {} } = respond(config)
    return { data, status: 200, statusText: 'OK', headers, config }
  }
  apiClient.defaults.adapter = adapter
  return seen
}

describe('new API calls', () => {
  it('eraseCustomer sends the ERASE confirmation and the reason', async () => {
    const seen = capture(() => ({ data: { message: 'Customer erased.' } }))
    await eraseCustomer(1, 9, 'Asked by email')
    expect(seen[0].url).toBe('/shops/1/customers/9/erase')
    expect(JSON.parse(String(seen[0].data))).toEqual({ confirm: 'ERASE', reason: 'Asked by email' })
  })

  it('uploadProductImage posts multipart and unwraps the product', async () => {
    const seen = capture(() => ({ data: { data: { id: 3, image_url: '/storage/products/1/a.jpg' } } }))
    const product = await uploadProductImage(1, 3, new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(seen[0].data).toBeInstanceOf(FormData)
    expect(product.image_url).toBe('/storage/products/1/a.jpg')
  })

  it('downloadFile saves under the filename the server sends', async () => {
    capture(() => ({
      data: new Blob(['a,b']),
      headers: { 'content-disposition': 'attachment; filename="orders-ALPHA-20261017.csv"' },
    }))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let savedAs = ''
    click.mockImplementation(function (this: HTMLAnchorElement) {
      savedAs = this.download
    })

    await downloadFile('/shops/1/orders/export', { seller: 'shop' })
    expect(savedAs).toBe('orders-ALPHA-20261017.csv')
  })
})

describe('SalesTrend', () => {
  it('draws one bar per bucket and shows the period total', () => {
    render(
      <SalesTrend
        bucket="day"
        points={[
          { date: '2026-10-15', orders: 0, gloma: '0.00', shop: '0.00', total: '0.00' },
          { date: '2026-10-16', orders: 2, gloma: '4000.00', shop: '2000.00', total: '6000.00' },
        ]}
      />
    )
    expect(screen.getByRole('img', { name: /6000\.00 rupees from 2 orders/ })).toBeInTheDocument()
    expect(screen.getByText('2 delivered orders')).toBeInTheDocument()
    expect(screen.getByTitle(/16 Oct: Rs 6000\.00 \(2 orders\)/)).toBeInTheDocument()
  })

  it('shows a plain empty state when nothing sold', () => {
    render(<SalesTrend bucket="day" points={[{ date: '2026-10-16', orders: 0, gloma: '0.00', shop: '0.00', total: '0.00' }]} />)
    expect(screen.getByText(/No delivered sales in this period yet/)).toBeInTheDocument()
  })
})

describe('ResetPasswordPage', () => {
  const renderAt = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    )

  it('explains an incomplete link', () => {
    renderAt('/reset-password')
    expect(screen.getByText(/Open the link from your email again/)).toBeInTheDocument()
  })

  it('checks the two passwords match before calling the API', async () => {
    const seen = capture(() => ({ data: { message: 'ok' } }))
    renderAt('/reset-password?token=abc&email=a%40b.lk')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^New password/), 'secret-123')
    await user.type(screen.getByLabelText(/Repeat new password/), 'secret-124')
    await user.click(screen.getByRole('button', { name: /Save new password/ }))
    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(seen).toHaveLength(0)
  })
})
