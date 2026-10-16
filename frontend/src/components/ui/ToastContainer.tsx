import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react'
import { toast, type ToastMessage } from '@/lib/toast'

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    return toast.subscribe(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const icon = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          danger: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
        }[t.type]

        const bg = {
          success: 'bg-white border-emerald-200 text-gray-900',
          danger: 'bg-white border-rose-200 text-gray-900',
          warning: 'bg-white border-amber-200 text-gray-900',
          info: 'bg-white border-sky-200 text-gray-900',
        }[t.type]

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-lg transition-all transform ease-out duration-200 ${bg}`}
          >
            {icon}
            <div className="flex-1 text-sm font-medium">{t.message}</div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
