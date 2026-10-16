import { describe, it, expect, afterEach } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { apiClient } from '@/api/client'
import { getCustomer, lookupCustomer } from '@/api/customers'
import { getOrder } from '@/api/orders'
import { getTemplates } from '@/api/settings'

/*
 * Contract tests: feed the API layer the exact envelopes the Laravel backend returns (see docs/API.md and
 * backend/tests/Feature/ContractTest.php) and check each function unwraps them correctly.
 * Mocking the API functions themselves cannot catch an unwrap mistake — this does.
 */

const originalAdapter = apiClient.defaults.adapter

function serve(routes: Record<string, unknown>) {
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const path = (config.url ?? '').split('?')[0]
    if (!(path in routes)) {
      throw new Error(`Unexpected request to ${path}`)
    }
    return { data: routes[path], status: 200, statusText: 'OK', headers: {}, config }
  }
  apiClient.defaults.adapter = adapter
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

const customer = {
  id: 1,
  name: 'Kamal Perera',
  phone: '+94771234567',
  phone_local: '0771234567',
  email: null,
  address: '10 Temple Road',
  city: 'Kandy',
  is_risky: true,
  risk_note: 'Fake address twice',
  orders_count: 1,
  returns_count: 0,
  has_warning: true,
  warnings: [{ code: 'flagged_risky', level: 'danger', message: 'Flagged as risky: Fake address twice' }],
  created_at: '2026-10-16T20:45:00+05:30',
}

describe('API layer unwraps the backend envelopes', () => {
  it('lookupCustomer returns {phone, customer, warnings} from {data: {...}}', async () => {
    serve({
      '/shops/1/customers/lookup': {
        data: { phone: '+94771234567', phone_local: '0771234567', customer, warnings: customer.warnings },
      },
    })
    const res = await lookupCustomer(1, '0771234567')
    expect(res.customer?.name).toBe('Kamal Perera')
    expect(res.warnings[0].code).toBe('flagged_risky')
  })

  it('getCustomer returns {customer, recent_orders} from {data: {...}}', async () => {
    serve({ '/shops/1/customers/1': { data: { customer, recent_orders: [] } } })
    const res = await getCustomer(1, 1)
    expect(res.customer.id).toBe(1)
    expect(res.recent_orders).toEqual([])
  })

  it('getOrder returns the order from {data: {...}}', async () => {
    serve({ '/shops/1/orders/7': { data: { id: 7, number: 'DEMO-000007', available_actions: ['confirm'] } } })
    const order = await getOrder(1, 7)
    expect(order.number).toBe('DEMO-000007')
    expect(order.available_actions).toEqual(['confirm'])
  })

  it('getTemplates keeps placeholders as a flat list of tokens', async () => {
    serve({ '/shops/1/templates': { data: [], placeholders: ['{shop_name}', '{order_number}'] } })
    const res = await getTemplates(1)
    expect(res.placeholders).toEqual(['{shop_name}', '{order_number}'])
  })
})
