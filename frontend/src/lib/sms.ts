/**
 * SMS segment calculation matching backend SmsSegments.php
 * GSM-7 = 160 chars (153 per part for multi-part)
 * Unicode (Sinhala, Tamil, emojis) = 70 chars (67 per part for multi-part)
 */

const GSM7 = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM7_EXT = '^{}\\[~]|€'

export function isUnicode(text: string): boolean {
  for (const char of Array.from(text)) {
    if (!GSM7.includes(char) && !GSM7_EXT.includes(char)) {
      return true
    }
  }
  return false
}

export interface SmsCalculation {
  segments: number
  characterCount: number
  isUnicode: boolean
  charsPerSegment: number
  remainingInSegment: number
}

export function calculateSmsSegments(text: string): SmsCalculation {
  if (!text) {
    return {
      segments: 0,
      characterCount: 0,
      isUnicode: false,
      charsPerSegment: 160,
      remainingInSegment: 160,
    }
  }

  const unicode = isUnicode(text)

  if (unicode) {
    const chars = Array.from(text).length
    if (chars <= 70) {
      return {
        segments: 1,
        characterCount: chars,
        isUnicode: true,
        charsPerSegment: 70,
        remainingInSegment: 70 - chars,
      }
    }
    const segments = Math.ceil(chars / 67)
    const remaining = segments * 67 - chars
    return {
      segments,
      characterCount: chars,
      isUnicode: true,
      charsPerSegment: 67,
      remainingInSegment: remaining,
    }
  }

  // GSM-7 calculation with 2-char escapes
  let length = 0
  for (const char of Array.from(text)) {
    length += GSM7_EXT.includes(char) ? 2 : 1
  }

  if (length <= 160) {
    return {
      segments: 1,
      characterCount: length,
      isUnicode: false,
      charsPerSegment: 160,
      remainingInSegment: 160 - length,
    }
  }

  const segments = Math.ceil(length / 153)
  const remaining = segments * 153 - length
  return {
    segments,
    characterCount: length,
    isUnicode: false,
    charsPerSegment: 153,
    remainingInSegment: remaining,
  }
}
