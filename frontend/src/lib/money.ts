/**
 * Exact LKR currency formatting and integer cent conversions for UI live draft calculations.
 * Always handles decimal strings ("1250.00") without floating point inaccuracies.
 */

export function formatMoney(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Rs 0.00'
  }

  const str = typeof amount === 'number' ? amount.toFixed(2) : String(amount).trim()
  const isNegative = str.startsWith('-')
  const clean = isNegative ? str.slice(1) : str

  const parts = clean.split('.')
  const integerPart = parts[0] || '0'
  const decimalPart = (parts[1] || '00').padEnd(2, '0').slice(0, 2)

  // Add thousand separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const formatted = `Rs ${formattedInteger}.${decimalPart}`

  return isNegative ? `-${formatted}` : formatted
}

/**
 * Converts a decimal string ("1250.50") into integer cents (125050).
 */
export function toCents(amount: string | number | null | undefined): number {
  if (!amount) return 0
  const str = typeof amount === 'number' ? amount.toFixed(2) : String(amount).trim()
  const isNegative = str.startsWith('-')
  const clean = isNegative ? str.slice(1) : str
  const [intStr = '0', decStr = '00'] = clean.split('.')
  const cents = parseInt(intStr, 10) * 100 + parseInt(decStr.padEnd(2, '0').slice(0, 2), 10)
  return isNegative ? -cents : cents
}

/**
 * Converts integer cents back to exact 2-decimal string ("1250.50").
 */
export function fromCents(cents: number): string {
  const isNegative = cents < 0
  const absCents = Math.abs(cents)
  const intPart = Math.floor(absCents / 100)
  const decPart = (absCents % 100).toString().padStart(2, '0')
  const result = `${intPart}.${decPart}`
  return isNegative ? `-${result}` : result
}
