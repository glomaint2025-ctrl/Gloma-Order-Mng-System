import { describe, it, expect } from 'vitest'
import { monthStartYmd, todayYmd } from '@/lib/date'

// Sri Lanka is UTC+05:30. toISOString() would give the previous day before 05:30 local time.
describe('Colombo date helpers', () => {
  it('gives the Colombo date, not the UTC date', () => {
    // 2026-10-16 20:00 UTC = 2026-10-17 01:30 in Colombo
    expect(todayYmd(new Date('2026-10-16T20:00:00Z'))).toBe('2026-10-17')
  })

  it('gives the first day of the Colombo month', () => {
    // 2026-10-31 19:00 UTC = 2026-11-01 00:30 in Colombo
    expect(monthStartYmd(new Date('2026-10-31T19:00:00Z'))).toBe('2026-11-01')
    expect(monthStartYmd(new Date('2026-10-16T06:00:00Z'))).toBe('2026-10-01')
  })
})
