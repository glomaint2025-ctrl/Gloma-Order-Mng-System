import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from '@/lib/toast'

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

// Ensures CSRF cookie is initialized
export async function initCsrf(): Promise<void> {
  try {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
  } catch (error) {
    console.error('Failed to get CSRF cookie', error)
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status
    const data = error.response?.data
    const originalRequest = error.config as CustomRequestConfig | undefined

    // 401 Unauthenticated
    if (status === 401) {
      // Pages that work without a login (the reset link from the email lands on /reset-password).
      const publicPaths = ['/login', '/forgot-password', '/reset-password']
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // 419 CSRF Token Expired -> retry once
    if (status === 419 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      await initCsrf()
      return apiClient(originalRequest)
    }

    // 409 Conflict (e.g. stale_version, insufficient_stock, shop_closed, invalid_transition)
    if (status === 409) {
      if (data?.message) {
        toast.show(data.message, 'danger')
      }
      return Promise.reject(error)
    }

    // 403 Forbidden
    if (status === 403) {
      if (data?.message) {
        toast.show(data.message, 'danger')
      }
      return Promise.reject(error)
    }

    // 422 Validation
    if (status === 422) {
      // If code is present (rule error) and no individual field errors, or if generic message
      if (data?.message && !data.errors) {
        toast.show(data.message, 'warning')
      }
      return Promise.reject(error)
    }

    // 429 Throttle
    if (status === 429) {
      toast.show(data?.message || 'Too many attempts. Please wait a moment.', 'warning')
      return Promise.reject(error)
    }

    // 500+ Server error
    if (status && status >= 500) {
      toast.show('Server error occurred. Please try again.', 'danger')
    }

    return Promise.reject(error)
  }
)
