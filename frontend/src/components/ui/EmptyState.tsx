import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon = <Inbox className="w-10 h-10 text-gray-400" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-gray-300 bg-white/50 my-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 border border-gray-100 mb-3">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {description && <p className="mt-1 text-xs text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
