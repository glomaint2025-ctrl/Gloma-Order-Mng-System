import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminSmsUsage } from '@/api/admin'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCurrentMonth } from '@/lib/date'

export function SmsUsagePage() {
  const [month, setMonth] = useState(() => getCurrentMonth())

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sms-usage', month],
    queryFn: () => getAdminSmsUsage({ month }),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">SMS Usage & Billing</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monthly SMS messages, segment breakdown, and billing charges per partner shop
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-xs shadow-2xs">
          <span className="text-gray-500 font-medium">Select Month:</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-gray-900 font-semibold focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : !data ? (
        <EmptyState title="No usage data" description="Could not load SMS billing data." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Billing Month
              </span>
              <span className="text-lg font-bold text-gray-900 mt-1 block">{data.month}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Rate Per SMS Segment
              </span>
              <span className="text-lg font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.cost_per_segment} />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800 block">
                Total Billed to Shops
              </span>
              <span className="text-lg font-bold text-indigo-700 mt-1 block">
                <MoneyDisplay amount={data.total_cost} />
              </span>
            </div>
          </div>

          {/* Per Shop Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">Shop</th>
                  <th scope="col" className="px-4 py-3 text-center">Messages Sent</th>
                  <th scope="col" className="px-4 py-3 text-center">Failed</th>
                  <th scope="col" className="px-4 py-3 text-center">Total Segments</th>
                  <th scope="col" className="px-4 py-3 text-right">Billed Cost (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.shops.map((row) => (
                  <tr key={row.shop.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div>{row.shop.name}</div>
                      <span className="text-[10px] text-gray-400 font-mono">Code: {row.shop.code}</span>
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-gray-800">
                      {row.sent}
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-rose-600">
                      {row.failed}
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-indigo-700">
                      {row.segments}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-sm">
                      <MoneyDisplay amount={row.cost} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
