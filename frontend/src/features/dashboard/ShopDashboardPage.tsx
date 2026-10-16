import { monthStartYmd, todayYmd } from '@/lib/date'
import { SalesTrend } from './SalesTrend'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '@/api/finance'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import {
  ShoppingCart,
  Package,
  DollarSign,
  Truck,
  RotateCcw,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

export function ShopDashboardPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const navigate = useNavigate()

  // Default to this month
  const now = new Date()
  const firstDay = monthStartYmd(now)
  const today = todayYmd(now)

  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', parsedShopId, from, to],
    queryFn: () => getDashboard(parsedShopId, { from, to }),
    enabled: parsedShopId > 0,
    refetchInterval: 60000, // Poll every 60 s
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header and Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Shop Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time overview of orders, inventory, and finances</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            title="Refresh dashboard figures"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {data.trend && <SalesTrend bucket={data.trend.bucket} points={data.trend.points} />}

      {/* Orders To Act On */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Orders to Act On
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate(`/shops/${parsedShopId}/orders?status=awaiting_confirmation`)}
            className="p-4 bg-white rounded-xl border border-amber-200 bg-amber-50/20 text-left hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-amber-700 font-semibold mb-1">
              <span>Awaiting Confirmation</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.open_orders.awaiting_confirmation}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/shops/${parsedShopId}/orders?status=processing`)}
            className="p-4 bg-white rounded-xl border border-blue-200 bg-blue-50/20 text-left hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-blue-700 font-semibold mb-1">
              <span>Processing</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.open_orders.processing}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/shops/${parsedShopId}/orders?status=packed`)}
            className="p-4 bg-white rounded-xl border border-indigo-200 bg-indigo-50/20 text-left hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold mb-1">
              <span>Packed</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.open_orders.packed}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/shops/${parsedShopId}/orders?status=dispatched`)}
            className="p-4 bg-white rounded-xl border border-purple-200 bg-purple-50/20 text-left hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-purple-700 font-semibold mb-1">
              <span>Dispatched</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.open_orders.dispatched}
            </div>
          </button>
        </div>
      </div>

      {/* Stock and Sales Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stock Overview Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Stock Inventory</h3>
            </div>
            <button
              onClick={() => navigate(`/shops/${parsedShopId}/stock`)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              View Stock <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs text-gray-500 font-medium block">Total Stock Units</span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                {data.stock.units} <span className="text-xs font-normal text-gray-500">units</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs text-gray-500 font-medium block">Total Stock Value</span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.stock.value} />
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-500">By Location:</span>
              {Object.entries(data.stock.by_location).map(([loc, count]) => (
                <span key={loc} className="bg-gray-100 px-2 py-0.5 rounded font-medium capitalize">
                  {loc}: {count}
                </span>
              ))}
            </div>
            {data.stock.low_stock > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                {data.stock.low_stock} low in stock
              </span>
            )}
          </div>
        </div>

        {/* Sales in Selected Period */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Delivered Sales (Period)</h3>
            </div>
            <button
              onClick={() => navigate(`/shops/${parsedShopId}/reports`)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Full Report <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs text-indigo-700 font-semibold block">Gloma Channel</span>
              <span className="text-lg font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.sales.gloma?.revenue || '0.00'} />
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                {data.sales.gloma?.orders || 0} orders &bull; {data.sales.gloma?.units || 0} units
              </span>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs text-emerald-700 font-semibold block">Shop Channel</span>
              <span className="text-lg font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.sales.shop?.revenue || '0.00'} />
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                {data.sales.shop?.orders || 0} orders &bull; {data.sales.shop?.units || 0} units
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Returned orders in period:</span>
            <span className="font-bold text-gray-900 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> {data.returns}
            </span>
          </div>
        </div>
      </div>

      {/* COD Outstanding & Money Invested */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* COD Outstanding */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Truck className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">COD Outstanding (With Courier)</h3>
          </div>
          <p className="text-xs text-gray-500 mt-2">Delivered to customer but COD remittance pending</p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-purple-50/40 border border-purple-100">
              <span className="text-xs text-purple-800 font-medium block">Gloma Orders</span>
              <span className="text-base font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.cod_outstanding.gloma?.amount || '0.00'} />
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                {data.cod_outstanding.gloma?.orders || 0} orders
              </span>
            </div>

            <div className="p-3 rounded-lg bg-purple-50/40 border border-purple-100">
              <span className="text-xs text-purple-800 font-medium block">Shop Orders</span>
              <span className="text-base font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.cod_outstanding.shop?.amount || '0.00'} />
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                {data.cod_outstanding.shop?.orders || 0} orders
              </span>
            </div>
          </div>
        </div>

        {/* Money Invested */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">Money Invested In Stock</h3>
            </div>
            <button
              onClick={() => navigate(`/shops/${parsedShopId}/money`)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Ledger <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">Received</span>
              <span className="text-sm font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.investment.received_from_shop} />
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium block">Spent on Stock</span>
              <span className="text-sm font-bold text-gray-900 mt-1 block">
                <MoneyDisplay amount={data.investment.spent_on_stock} />
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
              <span className="text-[11px] text-indigo-700 font-medium block">Unspent Pool</span>
              <span className="text-sm font-bold text-indigo-900 mt-1 block">
                <MoneyDisplay amount={data.investment.unspent} />
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Net Balance Held by Gloma:</span>
            <span className="font-bold text-gray-900">
              <MoneyDisplay amount={data.balances.gloma} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
