import { apiClient } from './client'
import type { Order, OrderInput, OrderListItem, OrderNote, PaginatedResponse } from './types'

export interface OrderFilterParams {
  status?: string
  payment_status?: string
  seller?: string
  channel?: string
  search?: string
  from?: string
  to?: string
  needs_action?: boolean | number
  page?: number
  per_page?: number
}

export async function getOrders(shopId: number, params?: OrderFilterParams): Promise<PaginatedResponse<OrderListItem>> {
  const res = await apiClient.get<PaginatedResponse<OrderListItem>>(`/shops/${shopId}/orders`, { params })
  return res.data
}

export async function getOrder(shopId: number, orderId: number): Promise<Order> {
  const res = await apiClient.get<{ data: Order }>(`/shops/${shopId}/orders/${orderId}`)
  return res.data.data
}

export async function createOrder(shopId: number, input: OrderInput): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders`, input)
  return res.data.data
}

export async function updateOrder(shopId: number, orderId: number, input: OrderInput): Promise<Order> {
  const res = await apiClient.patch<{ data: Order }>(`/shops/${shopId}/orders/${orderId}`, input)
  return res.data.data
}

export async function confirmOrder(shopId: number, orderId: number): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/confirm`)
  return res.data.data
}

export async function packOrder(shopId: number, orderId: number): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/pack`)
  return res.data.data
}

export async function dispatchOrder(
  shopId: number,
  orderId: number,
  payload: { courier_account_id: number; tracking_number: string; courier_charge?: string | null }
): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/dispatch`, payload)
  return res.data.data
}

export async function deliverOrder(
  shopId: number,
  orderId: number,
  payload: { record_payment?: boolean; reference?: string | null }
): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/deliver`, payload)
  return res.data.data
}

export async function cancelOrder(shopId: number, orderId: number, payload: { reason: string }): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/cancel`, payload)
  return res.data.data
}

export async function returnOrder(
  shopId: number,
  orderId: number,
  payload: {
    reason: string
    return_charge?: string | null
    items?: { order_item_id: number; damaged_qty: number }[]
  }
): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/return`, payload)
  return res.data.data
}

export async function recordPayment(shopId: number, orderId: number, formData: FormData): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/payments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function refundOrder(shopId: number, orderId: number, payload: { reference?: string }): Promise<Order> {
  const res = await apiClient.post<{ data: Order }>(`/shops/${shopId}/orders/${orderId}/refund`, payload)
  return res.data.data
}

export async function addOrderNote(shopId: number, orderId: number, body: string): Promise<OrderNote> {
  const res = await apiClient.post<{ data: OrderNote }>(`/shops/${shopId}/orders/${orderId}/notes`, { body })
  return res.data.data
}

export async function printOrders(
  shopId: number,
  type: 'invoice' | 'label',
  orderIds: number[]
): Promise<Blob> {
  const res = await apiClient.post(
    `/shops/${shopId}/orders/print`,
    { type, order_ids: orderIds },
    { responseType: 'blob' }
  )
  return res.data
}
