import { apiClient } from './client'
import type {
  DashboardData,
  LedgerEntry,
  LedgerSummary,
  MessageLog,
  PaginatedResponse,
  SalesReportData,
} from './types'

export async function getDashboard(
  shopId: number,
  params?: { from?: string; to?: string }
): Promise<DashboardData> {
  const res = await apiClient.get<{ data: DashboardData }>(`/shops/${shopId}/dashboard`, { params })
  return res.data.data
}

export async function getSalesReport(
  shopId: number,
  params?: { from?: string; to?: string }
): Promise<SalesReportData> {
  const res = await apiClient.get<{ data: SalesReportData }>(`/shops/${shopId}/reports/sales`, { params })
  return res.data.data
}

export async function getLedger(
  shopId: number,
  params?: { party?: string; type?: string; from?: string; to?: string; page?: number; per_page?: number }
): Promise<PaginatedResponse<LedgerEntry> & { summary: LedgerSummary }> {
  const res = await apiClient.get<PaginatedResponse<LedgerEntry> & { summary: LedgerSummary }>(
    `/shops/${shopId}/ledger`,
    { params }
  )
  return res.data
}

export async function createLedgerEntry(
  shopId: number,
  payload: {
    type: 'shop_payment' | 'gloma_fee' | 'payout' | 'adjustment'
    amount: string | number
    party?: string | null
    description: string
    occurred_on?: string | null
  }
): Promise<LedgerEntry> {
  const res = await apiClient.post<{ data: LedgerEntry }>(`/shops/${shopId}/ledger`, payload)
  return res.data.data
}

export async function getMessages(
  shopId: number,
  params?: { month?: string; channel?: string; status?: string; page?: number; per_page?: number }
): Promise<PaginatedResponse<MessageLog> & { summary: { month: string; sms_sent: number; sms_segments: number; sms_cost: string; failed: number } }> {
  const res = await apiClient.get<
    PaginatedResponse<MessageLog> & {
      summary: { month: string; sms_sent: number; sms_segments: number; sms_cost: string; failed: number }
    }
  >(`/shops/${shopId}/messages`, { params })
  return res.data
}
