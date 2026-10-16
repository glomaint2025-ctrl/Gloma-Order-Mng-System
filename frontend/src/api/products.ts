import { apiClient } from './client'
import type { PaginatedResponse, Product } from './types'

export async function getProducts(
  shopId: number,
  params?: { search?: string; active?: number; per_page?: number; page?: number }
): Promise<PaginatedResponse<Product>> {
  const res = await apiClient.get<PaginatedResponse<Product>>(`/shops/${shopId}/products`, { params })
  return res.data
}

export async function getProduct(shopId: number, productId: number): Promise<Product> {
  const res = await apiClient.get<{ data: Product }>(`/shops/${shopId}/products/${productId}`)
  return res.data.data
}

export async function createProduct(
  shopId: number,
  payload: { sku: string; name: string; description?: string | null; price: string }
): Promise<Product> {
  const res = await apiClient.post<{ data: Product }>(`/shops/${shopId}/products`, payload)
  return res.data.data
}

export async function updateProduct(
  shopId: number,
  productId: number,
  payload: Partial<{ sku: string; name: string; description: string | null; price: string; is_active: boolean }>
): Promise<Product> {
  const res = await apiClient.patch<{ data: Product }>(`/shops/${shopId}/products/${productId}`, payload)
  return res.data.data
}

export async function uploadProductImage(shopId: number, productId: number, file: File): Promise<Product> {
  const form = new FormData()
  form.append('image', file)
  const res = await apiClient.post<{ data: Product }>(`/shops/${shopId}/products/${productId}/image`, form)
  return res.data.data
}

export async function deleteProductImage(shopId: number, productId: number): Promise<Product> {
  const res = await apiClient.delete<{ data: Product }>(`/shops/${shopId}/products/${productId}/image`)
  return res.data.data
}
