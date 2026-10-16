import { isAxiosError } from 'axios'

export interface ApiErrorInfo {
  status?: number
  message?: string
  code?: string
  errors?: Record<string, string[]>
}

/** Typed view of any thrown value: the API's {message, code, errors} for axios errors, else the Error message. */
export function apiError(err: unknown): ApiErrorInfo {
  if (isAxiosError<{ message?: string; code?: string; errors?: Record<string, string[]> }>(err)) {
    const data = err.response?.data
    return { status: err.response?.status, message: data?.message, code: data?.code, errors: data?.errors }
  }
  return { message: err instanceof Error ? err.message : undefined }
}
