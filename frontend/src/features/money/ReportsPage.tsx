import { monthStartYmd, todayYmd } from '@/lib/date'
import { ExportButton } from '@/components/ui/ExportButton'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSalesReport } from '@/api/finance'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Info, RefreshCw } from 'lucide-react'

export function ReportsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)

  // Default to current month
  const now = new Date()
  const firstDay = monthStartYmd(now)
  const today = todayYmd(now)

  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sales-report', parsedShopId, from, to],
    queryFn: () => getSalesReport(parsedShopId, { from, to }),
    enabled: parsedShopId > 0,
  })

  return (
    <div className="space-y-6">
      {/* Header and Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales & Profit Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Realized product sales, cost of goods, and gross profit in selected period
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
            title="Refresh sales figures"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <ExportButton url={`/shops/${parsedShopId}/reports/sales/export`} params={{ from, to }} />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : !data ? (
        <EmptyState title="No report data" description="Select a valid period to view sales figures." />
      ) : (
        <>
          {/* Summary Totals Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Net Items Revenue
              </span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.totals.net_revenue} />
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Gross: <MoneyDisplay amount={data.totals.items_revenue} /> &bull; Disc: <MoneyDisplay amount={data.totals.discounts} />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Cost of Goods (COGS)
              </span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.totals.cost_of_goods_sold} />
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Weighted average cost basis
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
                Delivery vs Courier Fees
              </span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.totals.delivery_fees_collected} />
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Charges: <MoneyDisplay amount={data.totals.courier_charges} /> &bull; Return fees: <MoneyDisplay amount={data.totals.return_charges} />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
                Realized Gross Profit
              </span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">
                <MoneyDisplay amount={data.totals.gross_profit} />
              </span>
              <span className="text-[10px] text-emerald-600 mt-1 block">
                Real profit generated in period
              </span>
            </div>
          </div>

          {/* Legal Note Notice */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{data.note} (Compliant with CBSL §83C: No forecast or guaranteed returns)</span>
          </div>

          {/* Product Breakdown Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Product Sales & Profit Breakdown
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-3.5 py-2.5">Product</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Bought</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Gloma Sold</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Shop Sold</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Revenue</th>
                    <th scope="col" className="px-3 py-2.5 text-right">COGS</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Gross Profit</th>
                    <th scope="col" className="px-3 py-2.5 text-center">In Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.products.map((p) => (
                    <tr key={p.product_id} className="hover:bg-gray-50/50">
                      <td className="px-3.5 py-3 font-semibold text-gray-900">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</div>
                      </td>

                      <td className="px-3 py-3 text-center text-gray-700">
                        {p.bought_qty}
                      </td>

                      <td className="px-3 py-3 text-center text-indigo-700 font-medium">
                        {p.sold.gloma?.qty || 0}
                      </td>

                      <td className="px-3 py-3 text-center text-emerald-700 font-medium">
                        {p.sold.shop?.qty || 0}
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold text-gray-900">
                        <MoneyDisplay amount={p.revenue} />
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-gray-600">
                        <MoneyDisplay amount={p.cogs} />
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">
                        <MoneyDisplay amount={p.gross_profit} />
                      </td>

                      <td className="px-3 py-3 text-center font-bold text-gray-700">
                        {p.in_stock}
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
