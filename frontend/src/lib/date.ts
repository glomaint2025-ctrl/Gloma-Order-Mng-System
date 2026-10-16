/**
 * Date and time formatting helpers in Asia/Colombo timezone.
 */

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Colombo',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return dateString
  }
}

export function getCurrentMonth(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' })

/**
 * Today as YYYY-MM-DD in Asia/Colombo. Never use toISOString() for this: it converts to UTC,
 * which is the previous day before 05:30 in Sri Lanka.
 */
export function todayYmd(now: Date = new Date()): string {
  return ymd.format(now)
}

/** First day of the current month as YYYY-MM-DD in Asia/Colombo. */
export function monthStartYmd(now: Date = new Date()): string {
  return todayYmd(now).slice(0, 8) + '01'
}
