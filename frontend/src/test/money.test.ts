import { describe, it, expect } from 'vitest'
import { formatMoney, toCents, fromCents } from '@/lib/money'

describe('Money utilities', () => {
  it('formats positive decimal strings with thousand separators', () => {
    expect(formatMoney('1250.00')).toBe('Rs 1,250.00')
    expect(formatMoney('5000000.50')).toBe('Rs 5,000,000.50')
    expect(formatMoney('0.00')).toBe('Rs 0.00')
  })

  it('formats negative amounts correctly', () => {
    expect(formatMoney('-350.00')).toBe('-Rs 350.00')
    expect(formatMoney('-12000.50')).toBe('-Rs 12,000.50')
  })

  it('handles empty or null amounts gracefully', () => {
    expect(formatMoney(null)).toBe('Rs 0.00')
    expect(formatMoney(undefined)).toBe('Rs 0.00')
    expect(formatMoney('')).toBe('Rs 0.00')
  })

  it('accurately converts to and from integer cents without floating point errors', () => {
    expect(toCents('1250.00')).toBe(125000)
    expect(toCents('1250.50')).toBe(125050)
    expect(toCents('-350.25')).toBe(-35025)

    expect(fromCents(125000)).toBe('1250.00')
    expect(fromCents(125050)).toBe('1250.50')
    expect(fromCents(-35025)).toBe('-350.25')
  })
})
