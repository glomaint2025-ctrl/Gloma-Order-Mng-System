import { apiClient } from './client'
import type { Customer, CustomerLookupResult, OrderListItem, PaginatedResponse } from './types'

export async function getCustomers(
  shopId: number,
  params?: { search?: string; with_warning?: number; page?: number; per_page?: number }
): Promise<PaginatedResponse<Customer>> {
  const res = await apiClient.get<PaginatedResponse<Customer>>(`/shops/${shopId}/customers`, { params })
  return res.data
}

export async function lookupCustomer(shopId: number, phone: string): Promise<CustomerLookupResult> {
  const res = await apiClient.get<{ data: CustomerLookupResult }>(`/shops/${shopId}/customers/lookup`, {
    params: { phone },
  })
  return res.data.data
}

export async function getCustomer(
  shopId: number,
  customerId: number
): Promise<{ customer: Customer; recent_orders: OrderListItem[] }> {
  const res = await apiClient.get<{ data: { customer: Customer; recent_orders: OrderListItem[] } }>(
    `/shops/${shopId}/customers/${customerId}`
  )
  return res.data.data
}

export async function updateCustomer(
  shopId: number,
  customerId: number,
  payload: Partial<{
    name: string
    email: string | null
    address: string | null
    city: string | null
    is_risky: boolean
    risk_note: string | null
  }>
): Promise<Customer> {
  const res = await apiClient.patch<{ data: Customer }>(`/shops/${shopId}/customers/${customerId}`, payload)
  return res.data.data
}
