import { describe, it, expect } from 'vitest'
import { calculateSmsSegments, isUnicode } from '@/lib/sms'

describe('SMS segment counter', () => {
  it('detects standard GSM-7 text correctly', () => {
    expect(isUnicode('Hello, your order SHOP-0001 has been dispatched!')).toBe(false)
  })

  it('detects Sinhala and Unicode characters', () => {
    expect(isUnicode('ඔබගේ ඇණවුම ලැබුණි')).toBe(true)
    expect(isUnicode('Special promo! 🚀')).toBe(true)
  })

  it('calculates GSM-7 single and multi-part segment boundaries', () => {
    // Empty text
    expect(calculateSmsSegments('').segments).toBe(0)

    // Single segment GSM-7 (<= 160)
    const singleGsm = 'A'.repeat(160)
    const singleResult = calculateSmsSegments(singleGsm)
    expect(singleResult.segments).toBe(1)
    expect(singleResult.remainingInSegment).toBe(0)
    expect(singleResult.isUnicode).toBe(false)

    // Multi-part GSM-7 (> 160 chars, parts of 153 chars each)
    const multiGsm = 'A'.repeat(161)
    const multiResult = calculateSmsSegments(multiGsm)
    expect(multiResult.segments).toBe(2)
    // 2 * 153 = 306 max for 2 segments. Remaining = 306 - 161 = 145
    expect(multiResult.remainingInSegment).toBe(145)
  })

  it('calculates Unicode (Sinhala) single and multi-part boundaries', () => {
    // Single segment Unicode (<= 70)
    const singleUni = 'ඔබගේ ඇණවුම'
    const singleUniResult = calculateSmsSegments(singleUni)
    expect(singleUniResult.segments).toBe(1)
    expect(singleUniResult.isUnicode).toBe(true)

    // Multi-part Unicode (> 70 chars, parts of 67 chars each)
    const longUni = 'අ'.repeat(71)
    const longUniResult = calculateSmsSegments(longUni)
    expect(longUniResult.segments).toBe(2)
    // 2 * 67 = 134 max for 2 segments. Remaining = 134 - 71 = 63
    expect(longUniResult.remainingInSegment).toBe(63)
  })

  it('counts GSM-7 extension characters (like €) as 2 characters', () => {
    const extText = '€'
    const res = calculateSmsSegments(extText)
    expect(res.characterCount).toBe(2)
    expect(res.remainingInSegment).toBe(158)
  })
})
