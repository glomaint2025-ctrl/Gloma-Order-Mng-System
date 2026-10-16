import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '@/api/customers'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Search, AlertTriangle, ChevronRight } from 'lucide-react'

export function CustomersPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [withWarningOnly, setWithWarningOnly] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', parsedShopId, { search, withWarningOnly, page }],
    queryFn: () =>
      getCustomers(parsedShopId, {
        search: search || undefined,
        with_warning: withWarningOnly ? 1 : undefined,
        page,
        per_page: 25,
      }),
    enabled: parsedShopId > 0,
  })

  const customers = data?.data || []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Customer directory with ordering history and delivery risk flags
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setWithWarningOnly(!withWarningOnly)
            setPage(1)
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            withWarningOnly
              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          ⚠ With Warnings Only
        </button>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Customers are automatically saved when delivery orders are placed."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {customers.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/shops/${parsedShopId}/customers/${c.id}`)}
                className="p-4 flex items-center justify-between hover:bg-gray-50/70 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                      {c.has_warning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Risk Alert
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{c.phone_local || c.phone}</span>
                      {c.city && <span>&bull; {c.city}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right hidden sm:block">
                    <span className="text-gray-900 font-semibold">{c.orders_count} orders</span>
                    {c.returns_count > 0 && (
                      <span className="text-rose-600 font-semibold block text-[11px]">
                        {c.returns_count} returns
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1 pt-2">
          <span>
            Page {meta.current_page} of {meta.last_page} ({meta.total} customers)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
