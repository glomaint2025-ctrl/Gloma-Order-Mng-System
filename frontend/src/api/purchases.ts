import { apiClient } from './client'
import type { PaginatedResponse, Purchase } from './types'

export async function getPurchases(
  shopId: number,
  params?: { page?: number; per_page?: number }
): Promise<PaginatedResponse<Purchase>> {
  const res = await apiClient.get<PaginatedResponse<Purchase>>(`/shops/${shopId}/purchases`, { params })
  return res.data
}

export async function getPurchase(shopId: number, purchaseId: number): Promise<Purchase> {
  const res = await apiClient.get<{ data: Purchase }>(`/shops/${shopId}/purchases/${purchaseId}`)
  return res.data.data
}

export async function createPurchase(
  shopId: number,
  payload: {
    reference?: string | null
    supplier?: string | null
    purchased_on: string
    notes?: string | null
    lines: {
      product_id: number
      qty: number
      unit_cost: string
      location?: string
    }[]
  }
): Promise<Purchase> {
  const res = await apiClient.post<{ data: Purchase }>(`/shops/${shopId}/purchases`, payload)
  return res.data.data
}
