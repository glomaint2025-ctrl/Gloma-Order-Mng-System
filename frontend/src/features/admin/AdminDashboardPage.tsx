import { monthStartYmd, todayYmd } from '@/lib/date'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAdminDashboard } from '@/api/admin'
import { useAuth } from '@/app/useAuth'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowRight } from 'lucide-react'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { setCurrentShopId } = useAuth()

  // Default to this month
  const now = new Date()
  const firstDay = monthStartYmd(now)
  const today = todayYmd(now)

  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', from, to],
    queryFn: () => getAdminDashboard({ from, to }),
  })

  const handleOpenShop = (shopId: number) => {
    setCurrentShopId(shopId)
    navigate(`/shops/${shopId}/dashboard`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Global Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Aggregated cross-shop performance, stock values, and partner health
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg p-1 text-xs shadow-2xs">
          <span className="text-gray-500 px-1 font-medium">From:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-xs text-gray-800 bg-transparent focus:outline-none"
          />
          <span className="text-gray-500 px-1 font-medium">To:</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-xs text-gray-800 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : !data ? (
        <EmptyState title="No data available" description="Could not load global statistics." />
      ) : (
        <>
          {/* Top Aggregated Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Total Stock Invested
              </span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.totals.stock_value} />
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Across all active partner shops
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block">
                Gloma Sales Revenue
              </span>
              <span className="text-xl font-bold text-indigo-800 mt-1 block">
                <MoneyDisplay amount={data.totals.revenue_gloma} />
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Period revenue</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
                Shop Sales Revenue
              </span>
              <span className="text-xl font-bold text-emerald-800 mt-1 block">
                <MoneyDisplay amount={data.totals.revenue_shop} />
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Period revenue</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-800 block">
                COD Outstanding
              </span>
              <span className="text-xl font-bold text-purple-900 mt-1 block">
                <MoneyDisplay amount={data.totals.cod_outstanding} />
              </span>
              <span className="text-[10px] text-purple-600 mt-1 block">
                Pending courier remittance
              </span>
            </div>
          </div>

          {/* Per Shop Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Partner Shops Performance
              </h2>
              <span className="text-xs text-gray-400">Click any shop row to open its portal</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3">Shop</th>
                    <th scope="col" className="px-4 py-3 text-center">Stock Units</th>
                    <th scope="col" className="px-4 py-3 text-right">Stock Value</th>
                    <th scope="col" className="px-4 py-3 text-right">Gloma Sales</th>
                    <th scope="col" className="px-4 py-3 text-right">Shop Sales</th>
                    <th scope="col" className="px-4 py-3 text-right">COD Outstanding</th>
                    <th scope="col" className="px-4 py-3 text-center">Open Orders</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.shops.map((row) => (
                    <tr
                      key={row.shop.id}
                      onClick={() => handleOpenShop(row.shop.id)}
                      className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{row.shop.name}</span>
                          <Badge tone={row.shop.status.tone || 'neutral'} size="sm">
                            {row.shop.status.label}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">Code: {row.shop.code}</span>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-gray-800">
                        {row.stock_units}
                        {row.low_stock > 0 && (
                          <span className="text-[10px] text-amber-600 block">
                            {row.low_stock} low
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        <MoneyDisplay amount={row.stock_value} />
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-indigo-700">
                        <MoneyDisplay amount={row.sales.gloma?.revenue || '0.00'} />
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        <MoneyDisplay amount={row.sales.shop?.revenue || '0.00'} />
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">
                        <MoneyDisplay amount={row.cod_outstanding} />
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-gray-800">
                        {row.open_orders}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
