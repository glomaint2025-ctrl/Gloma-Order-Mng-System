import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/api/client'
import { toast } from '@/lib/toast'
import type { AxiosError } from 'axios'

describe('apiClient response interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles 409 Conflict by displaying danger toast', async () => {
    const toastSpy = vi.spyOn(toast, 'show')

    // Trigger the response interceptor rejection
    const error = {
      response: {
        status: 409,
        data: { message: 'This order was modified by another user.', code: 'stale_version' },
      },
      config: {},
    } as AxiosError

    // @ts-expect-error accessing private interceptor handler
    const errorHandler = apiClient.interceptors.response.handlers[0]?.rejected as (err: unknown) => Promise<unknown>

    await expect(errorHandler(error)).rejects.toBe(error)
    expect(toastSpy).toHaveBeenCalledWith('This order was modified by another user.', 'danger')
  })

  it('handles 403 Forbidden by displaying danger toast', async () => {
    const toastSpy = vi.spyOn(toast, 'show')

    const error = {
      response: {
        status: 403,
        data: { message: 'You do not have permission to perform this action.' },
      },
      config: {},
    } as AxiosError

    // @ts-expect-error accessing private interceptor handler
    const errorHandler = apiClient.interceptors.response.handlers[0]?.rejected as (err: unknown) => Promise<unknown>

    await expect(errorHandler(error)).rejects.toBe(error)
    expect(toastSpy).toHaveBeenCalledWith('You do not have permission to perform this action.', 'danger')
  })

  it('handles 429 Throttle by displaying warning toast', async () => {
    const toastSpy = vi.spyOn(toast, 'show')

    const error = {
      response: {
        status: 429,
        data: { message: 'Too many login attempts. Please try again in 50 seconds.' },
      },
      config: {},
    } as AxiosError

    // @ts-expect-error accessing private interceptor handler
    const errorHandler = apiClient.interceptors.response.handlers[0]?.rejected as (err: unknown) => Promise<unknown>

    await expect(errorHandler(error)).rejects.toBe(error)
    expect(toastSpy).toHaveBeenCalledWith('Too many login attempts. Please try again in 50 seconds.', 'warning')
  })

  it('handles 422 with generic message and no field errors', async () => {
    const toastSpy = vi.spyOn(toast, 'show')

    const error = {
      response: {
        status: 422,
        data: { message: 'Shop is currently suspended.' },
      },
      config: {},
    } as AxiosError

    // @ts-expect-error accessing private interceptor handler
    const errorHandler = apiClient.interceptors.response.handlers[0]?.rejected as (err: unknown) => Promise<unknown>

    await expect(errorHandler(error)).rejects.toBe(error)
    expect(toastSpy).toHaveBeenCalledWith('Shop is currently suspended.', 'warning')
  })

  it('does not toast for 422 when individual field errors exist', async () => {
    const toastSpy = vi.spyOn(toast, 'show')

    const error = {
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: { customer_phone: ['Invalid phone number'] },
        },
      },
      config: {},
    } as AxiosError

    // @ts-expect-error accessing private interceptor handler
    const errorHandler = apiClient.interceptors.response.handlers[0]?.rejected as (err: unknown) => Promise<unknown>

    await expect(errorHandler(error)).rejects.toBe(error)
    expect(toastSpy).not.toHaveBeenCalled()
  })
})
