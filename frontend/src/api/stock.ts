import { apiClient } from './client'
import type { PaginatedResponse, Product, Shop, StockMovement } from './types'

export async function getStockMovements(
  shopId: number,
  params?: { product_id?: number; type?: string; location?: string; page?: number; per_page?: number }
): Promise<PaginatedResponse<StockMovement>> {
  const res = await apiClient.get<PaginatedResponse<StockMovement>>(`/shops/${shopId}/stock/movements`, { params })
  return res.data
}

export async function adjustStock(
  shopId: number,
  payload: { product_id: number; type: 'correction' | 'damage' | 'handover'; qty: number; location?: string; reason?: string }
): Promise<StockMovement> {
  const res = await apiClient.post<{ data: StockMovement }>(`/shops/${shopId}/stock/adjustments`, payload)
  return res.data.data
}

export async function transferStock(
  shopId: number,
  payload: { product_id: number; from: 'gloma' | 'shop'; to: 'gloma' | 'shop'; qty: number; reason?: string }
): Promise<Product> {
  const res = await apiClient.post<{ data: Product }>(`/shops/${shopId}/stock/transfers`, payload)
  return res.data.data
}

export async function switchStockMode(
  shopId: number,
  payload: { stock_mode: 'single' | 'by_location'; split?: { product_id: number; gloma: number; shop: number }[] }
): Promise<Shop> {
  const res = await apiClient.post<{ data: Shop }>(`/shops/${shopId}/stock/mode`, payload)
  return res.data.data
}
