import { apiClient } from './client'

/** Downloads an API file (CSV / JSON) with the session cookie and saves it under the server's filename. */
export async function downloadFile(url: string, params?: object, fallbackName = 'export.csv'): Promise<void> {
  const res = await apiClient.get<Blob>(url, { params, responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const name = match ? decodeURIComponent(match[1]) : fallbackName

  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
