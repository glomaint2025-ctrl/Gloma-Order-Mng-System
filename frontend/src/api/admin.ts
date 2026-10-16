import { apiClient } from './client'
import type {
  AdminDashboardData,
  AdminSmsUsage,
  AuditLog,
  Courier,
  CourierAccount,
  MessageTemplate,
  PaginatedResponse,
  Shop,
  User,
} from './types'

export async function getAdminDashboard(params?: { from?: string; to?: string }): Promise<AdminDashboardData> {
  const res = await apiClient.get<{ data: AdminDashboardData }>('/admin/dashboard', { params })
  return res.data.data
}

export async function getAdminSmsUsage(params?: { month?: string }): Promise<AdminSmsUsage> {
  const res = await apiClient.get<{ data: AdminSmsUsage }>('/admin/sms-usage', { params })
  return res.data.data
}

export async function getAdminShops(params?: { search?: string; status?: string; page?: number }): Promise<PaginatedResponse<Shop>> {
  const res = await apiClient.get<PaginatedResponse<Shop>>('/admin/shops', { params })
  return res.data
}

export async function createAdminShop(payload: {
  name: string
  code: string
  stock_mode?: string
  contract_ref?: string | null
  contract_started_on?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  owner: {
    user_id?: number
    name?: string
    email?: string
    password?: string
    phone?: string
  }
}): Promise<Shop> {
  const res = await apiClient.post<{ data: Shop }>('/admin/shops', payload)
  return res.data.data
}

export async function getAdminShop(shopId: number): Promise<Shop> {
  const res = await apiClient.get<{ data: Shop }>(`/admin/shops/${shopId}`)
  return res.data.data
}

export async function updateAdminShop(
  shopId: number,
  payload: Partial<{
    name: string
    contract_ref: string | null
    contract_started_on: string | null
    phone: string | null
    email: string | null
    address: string | null
    notes: string | null
  }>
): Promise<Shop> {
  const res = await apiClient.patch<{ data: Shop }>(`/admin/shops/${shopId}`, payload)
  return res.data.data
}

export async function setAdminShopStatus(
  shopId: number,
  status: 'active' | 'suspended' | 'closed'
): Promise<Shop> {
  const res = await apiClient.post<{ data: Shop }>(`/admin/shops/${shopId}/status`, { status })
  return res.data.data
}

export async function addAdminShopOwner(
  shopId: number,
  payload: {
    user_id?: number
    name?: string
    email?: string
    password?: string
    phone?: string
  }
): Promise<User> {
  const res = await apiClient.post<{ data: User }>(`/admin/shops/${shopId}/owners`, payload)
  return res.data.data
}

export async function removeAdminShopOwner(shopId: number, userId: number): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(`/admin/shops/${shopId}/owners/${userId}`)
  return res.data
}

export async function getAdminUsers(params?: { role?: string; search?: string; page?: number }): Promise<PaginatedResponse<User>> {
  const res = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params })
  return res.data
}

export async function createAdminUser(payload: {
  name: string
  email: string
  password?: string
  phone?: string | null
  role: 'gloma_admin' | 'shop_owner'
}): Promise<User> {
  const res = await apiClient.post<{ data: User }>('/admin/users', payload)
  return res.data.data
}

export async function getAdminUser(userId: number): Promise<User> {
  const res = await apiClient.get<{ data: User }>(`/admin/users/${userId}`)
  return res.data.data
}

export async function updateAdminUser(
  userId: number,
  payload: Partial<{
    name: string
    email: string
    phone: string | null
    is_active: boolean
    password?: string
  }>
): Promise<User> {
  const res = await apiClient.patch<{ data: User }>(`/admin/users/${userId}`, payload)
  return res.data.data
}

export async function getAdminCouriers(): Promise<Courier[]> {
  const res = await apiClient.get<{ data: Courier[] }>('/admin/couriers')
  return res.data.data
}

export async function updateAdminCourier(
  courierId: number,
  payload: Partial<{ name: string; tracking_url_template: string; is_active: boolean }>
): Promise<Courier> {
  const res = await apiClient.patch<{ data: Courier }>(`/admin/couriers/${courierId}`, payload)
  return res.data.data
}

export async function getGlomaCourierAccounts(): Promise<CourierAccount[]> {
  const res = await apiClient.get<{ data: CourierAccount[] }>('/admin/courier-accounts')
  return res.data.data
}

export async function createGlomaCourierAccount(payload: {
  courier_id: number
  label: string
  account_ref?: string | null
  default_charge?: string | null
  is_active?: boolean
}): Promise<CourierAccount> {
  const res = await apiClient.post<{ data: CourierAccount }>('/admin/courier-accounts', payload)
  return res.data.data
}

export async function updateGlomaCourierAccount(
  accountId: number,
  payload: Partial<{
    courier_id: number
    label: string
    account_ref: string | null
    default_charge: string | null
    is_active: boolean
  }>
): Promise<CourierAccount> {
  const res = await apiClient.patch<{ data: CourierAccount }>(`/admin/courier-accounts/${accountId}`, payload)
  return res.data.data
}

export async function getGlobalTemplates(): Promise<MessageTemplate[]> {
  const res = await apiClient.get<{ data: MessageTemplate[] }>('/admin/templates')
  return res.data.data
}

export async function saveGlobalTemplate(payload: {
  event: string
  channel: string
  subject?: string | null
  body: string
  is_active?: boolean
}): Promise<MessageTemplate> {
  const res = await apiClient.put<{ data: MessageTemplate }>('/admin/templates', payload)
  return res.data.data
}

export async function getAuditLogs(params?: {
  shop_id?: number
  user_id?: number
  action?: string
  from?: string
  to?: string
  page?: number
}): Promise<PaginatedResponse<AuditLog>> {
  const res = await apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', { params })
  return res.data
}
