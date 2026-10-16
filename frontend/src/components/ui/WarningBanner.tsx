import { AlertTriangle, AlertCircle } from 'lucide-react'
import type { OrderWarning } from '@/api/types'

export interface WarningBannerProps {
  warnings?: OrderWarning[] | null
  className?: string
}

export function WarningBanner({ warnings, className = '' }: WarningBannerProps) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {warnings.map((w, index) => {
        const isDanger = w.level === 'danger'
        return (
          <div
            key={index}
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
              isDanger
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {isDanger ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="font-medium leading-relaxed">{w.message}</div>
          </div>
        )
      })}
    </div>
  )
}
