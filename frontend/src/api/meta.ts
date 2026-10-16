import { apiClient } from './client'
import type { MetaData } from './types'

export async function getMeta(): Promise<MetaData> {
  const res = await apiClient.get<{ data: MetaData }>('/meta')
  return res.data.data
}

export async function getHealth(): Promise<{
  status: string
  database: boolean
  queue: { pending: number | null; failed: number | null }
  cron_last_run: string | null
  version: string
  time: string
}> {
  const res = await apiClient.get('/health')
  return res.data
}
