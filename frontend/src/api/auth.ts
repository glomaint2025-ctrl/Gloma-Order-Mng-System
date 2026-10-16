import { apiClient, initCsrf } from './client'
import type { MeData } from './types'

export async function login(credentials: { email: string; password: string; remember?: boolean }): Promise<MeData> {
  await initCsrf()
  const res = await apiClient.post<{ data: MeData }>('/auth/login', credentials)
  return res.data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function getMe(): Promise<MeData> {
  const res = await apiClient.get<{ data: MeData }>('/auth/me')
  return res.data.data
}

export async function changePassword(payload: {
  current_password: string
  password: string
  password_confirmation: string
}): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/auth/password', payload)
  return res.data
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  await initCsrf()
  const res = await apiClient.post<{ message: string }>('/auth/forgot-password', { email })
  return res.data
}

export async function resetPassword(payload: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<{ message: string }> {
  await initCsrf()
  const res = await apiClient.post<{ message: string }>('/auth/reset-password', payload)
  return res.data
}
