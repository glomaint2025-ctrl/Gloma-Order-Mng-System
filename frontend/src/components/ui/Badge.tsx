import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Tone } from '@/api/types'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  size?: 'sm' | 'md'
}

export function Badge({
  className,
  tone = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const toneStyles: Record<Tone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20',
    primary: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/20',
    neutral: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/10',
  }

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs font-medium rounded',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-full',
  }[size]

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 font-medium whitespace-nowrap',
          sizeStyles,
          toneStyles[tone] || toneStyles.neutral,
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  )
}
