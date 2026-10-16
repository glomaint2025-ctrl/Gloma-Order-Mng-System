import React from 'react'
import { formatMoney } from '@/lib/money'

export interface MoneyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: string | number | null | undefined
  tone?: 'default' | 'positive' | 'negative'
}

export function MoneyDisplay({ amount, tone = 'default', className = '', ...props }: MoneyDisplayProps) {
  const formatted = formatMoney(amount)
  const isNegative = String(amount).startsWith('-')

  let colorClass = 'text-gray-900'
  if (tone === 'positive' || (!isNegative && tone !== 'default')) {
    colorClass = 'text-emerald-600'
  } else if (tone === 'negative' || isNegative) {
    colorClass = 'text-rose-600'
  }

  return (
    <span className={`font-mono font-medium ${colorClass} ${className}`} {...props}>
      {formatted}
    </span>
  )
}
