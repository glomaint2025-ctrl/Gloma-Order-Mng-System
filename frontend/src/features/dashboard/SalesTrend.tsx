import type { TrendPoint } from '@/api/types'
import { toCents, fromCents } from '@/lib/money'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { TrendingUp } from 'lucide-react'

const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' })
const dayLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

function label(point: TrendPoint, bucket: 'day' | 'month'): string {
  // Bucket keys are plain dates (YYYY-MM-DD or YYYY-MM): format them without any timezone shift.
  const [y, m, d] = point.date.split('-').map(Number)
  const date = new Date(y, m - 1, d || 1)
  return bucket === 'month' ? monthLabel.format(date) : dayLabel.format(date)
}

/** Delivered sales per day (or month), stacked Gloma vs shop. Plain CSS bars: no chart library to load. */
export function SalesTrend({ bucket, points }: { bucket: 'day' | 'month'; points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => toCents(p.total)))
  const totalCents = points.reduce((sum, p) => sum + toCents(p.total), 0)
  const orders = points.reduce((sum, p) => sum + p.orders, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Sales trend ({bucket === 'month' ? 'by month' : 'by day'})
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Gloma</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Shop</span>
        </div>
      </div>

      {orders === 0 ? (
        <p className="text-xs text-gray-500 py-8 text-center">No delivered sales in this period yet.</p>
      ) : (
        <>
          <div
            className="flex items-end gap-0.5 h-32"
            role="img"
            aria-label={`Delivered sales ${fromCents(totalCents)} rupees from ${orders} orders in this period`}
          >
            {points.map((p) => {
              const gloma = (toCents(p.gloma) / max) * 100
              const shop = (toCents(p.shop) / max) * 100
              return (
                <div
                  key={p.date}
                  className="flex-1 h-full flex flex-col justify-end min-w-0"
                  title={`${label(p, bucket)}: Rs ${p.total} (${p.orders} order${p.orders === 1 ? '' : 's'})`}
                >
                  <div className="bg-emerald-500 rounded-t-sm" style={{ height: `${shop}%` }} />
                  <div className={`bg-indigo-500 ${shop === 0 ? 'rounded-t-sm' : ''}`} style={{ height: `${gloma}%` }} />
                  {p.orders === 0 && <div className="bg-gray-100 h-0.5" />}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
            <span>{label(points[0], bucket)}</span>
            <span>{label(points[points.length - 1], bucket)}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-600">
            <span>{orders} delivered order{orders === 1 ? '' : 's'}</span>
            <MoneyDisplay amount={fromCents(totalCents)} className="font-semibold text-gray-900" />
          </div>
        </>
      )}
    </div>
  )
}
