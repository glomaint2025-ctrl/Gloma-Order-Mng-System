/**
 * Sri Lankan phone formatting utilities.
 */

export function toLocalPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  if (e164.startsWith('+94') && e164.length === 12) {
    return '0' + e164.slice(3)
  }
  return e164
}

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = input.replace(/\D+/g, '')

  if (digits.startsWith('0094')) {
    digits = digits.slice(4)
  } else if (digits.startsWith('94') && digits.length === 11) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0') && digits.length === 10) {
    digits = digits.slice(1)
  }

  if (!/^[1-9]\d{8}$/.test(digits)) {
    return null
  }

  return '+94' + digits
}
