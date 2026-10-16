import { apiClient } from './client'
import type { CourierAccount, PaymentMethod, TemplateRow } from './types'

export async function getPaymentMethods(
  shopId: number,
  params?: { active_only?: number }
): Promise<PaymentMethod[]> {
  const res = await apiClient.get<{ data: PaymentMethod[] }>(`/shops/${shopId}/payment-methods`, { params })
  return res.data.data
}

export async function createPaymentMethod(
  shopId: number,
  payload: { name: string; kind: 'cod' | 'prepaid'; requires_slip?: boolean }
): Promise<PaymentMethod> {
  const res = await apiClient.post<{ data: PaymentMethod }>(`/shops/${shopId}/payment-methods`, payload)
  return res.data.data
}

export async function updatePaymentMethod(
  shopId: number,
  methodId: number,
  payload: Partial<{ name: string; kind: 'cod' | 'prepaid'; requires_slip: boolean; is_active: boolean }>
): Promise<PaymentMethod> {
  const res = await apiClient.patch<{ data: PaymentMethod }>(
    `/shops/${shopId}/payment-methods/${methodId}`,
    payload
  )
  return res.data.data
}

export async function getCourierAccounts(
  shopId: number,
  params?: { active_only?: number; for?: 'gloma' }
): Promise<CourierAccount[]> {
  const res = await apiClient.get<{ data: CourierAccount[] }>(`/shops/${shopId}/courier-accounts`, { params })
  return res.data.data
}

export async function createCourierAccount(
  shopId: number,
  payload: { courier_id: number; label: string; account_ref?: string | null; default_charge?: string | null }
): Promise<CourierAccount> {
  const res = await apiClient.post<{ data: CourierAccount }>(`/shops/${shopId}/courier-accounts`, payload)
  return res.data.data
}

export async function updateCourierAccount(
  shopId: number,
  accountId: number,
  payload: Partial<{ courier_id: number; label: string; account_ref: string | null; default_charge: string | null; is_active: boolean }>
): Promise<CourierAccount> {
  const res = await apiClient.patch<{ data: CourierAccount }>(
    `/shops/${shopId}/courier-accounts/${accountId}`,
    payload
  )
  return res.data.data
}

export async function getTemplates(
  shopId: number
): Promise<{ data: TemplateRow[]; placeholders: Record<string, string[]> }> {
  const res = await apiClient.get<{ data: TemplateRow[]; placeholders: Record<string, string[]> }>(
    `/shops/${shopId}/templates`
  )
  return res.data
}

export async function saveTemplate(
  shopId: number,
  payload: { event: string; channel: string; subject?: string | null; body: string; is_active?: boolean }
): Promise<void> {
  await apiClient.put(`/shops/${shopId}/templates`, payload)
}

export async function resetTemplate(
  shopId: number,
  payload: { event: string; channel: string }
): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(`/shops/${shopId}/templates`, { data: payload })
  return res.data
}
