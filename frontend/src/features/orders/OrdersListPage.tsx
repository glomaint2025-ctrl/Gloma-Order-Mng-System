import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOrders, printOrders } from '@/api/orders'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date'
import {
  Plus,
  Store,
  Search,
  Printer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export function OrdersListPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const navigate = useNavigate()

  // Filter state
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<string>('')
  const [seller, setSeller] = useState<string>('')
  const [channel, setChannel] = useState<string>('')
  const [needsAction, setNeedsAction] = useState<boolean>(false)
  const [page, setPage] = useState(1)

  // Selection for bulk printing
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([])
  const [isPrinting, setIsPrinting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: [
      'orders',
      parsedShopId,
      { search, status, paymentStatus, seller, channel, needsAction, page },
    ],
    queryFn: () =>
      getOrders(parsedShopId, {
        search: search || undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        seller: seller || undefined,
        channel: channel || undefined,
        needs_action: needsAction ? 1 : undefined,
        page,
        per_page: 25,
      }),
    enabled: parsedShopId > 0,
    refetchInterval: 30000, // Poll every 30 s
  })

  const orders = data?.data || []
  const meta = data?.meta

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(orders.map((o) => o.id))
    }
  }

  const handleBulkPrint = async (type: 'invoice' | 'label') => {
    if (selectedOrderIds.length === 0) return
    setIsPrinting(true)
    try {
      const blob = await printOrders(parsedShopId, type, selectedOrderIds)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      toast.show('Failed to generate PDF document.', 'danger')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage customer delivery orders and walk-in sales</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/shops/${parsedShopId}/orders/walk-in`)}
            icon={<Store className="w-3.5 h-3.5" />}
          >
            Walk-in Sale
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/shops/${parsedShopId}/orders/new`)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Order
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer name, phone, or tracking..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setNeedsAction(!needsAction)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                needsAction
                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              ⚠ Needs Action
            </button>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="awaiting_confirmation">Awaiting Confirmation</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={seller}
              onChange={(e) => {
                setSeller(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Sellers</option>
              <option value="gloma">Gloma</option>
              <option value="shop">Shop</option>
            </select>

            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value)
                setPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Channels</option>
              <option value="delivery">Delivery</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
            <span className="text-xs font-semibold text-indigo-900">
              {selectedOrderIds.length} orders selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkPrint('label')}
                isLoading={isPrinting}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Labels
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkPrint('invoice')}
                isLoading={isPrinting}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Invoices
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Orders List / Table */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try clearing search filters or create a new order."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/shops/${parsedShopId}/orders/new`)}
            >
              Create New Order
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50/75 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === orders.length && orders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th scope="col" className="px-3 py-3">Order #</th>
                  <th scope="col" className="px-3 py-3">Customer</th>
                  <th scope="col" className="px-3 py-3">Total</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Payment</th>
                  <th scope="col" className="px-3 py-3">Seller</th>
                  <th scope="col" className="px-3 py-3">Tracking</th>
                  <th scope="col" className="px-3 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id)
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/shops/${parsedShopId}/orders/${order.id}`)}
                      className={`hover:bg-gray-50/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="px-3 py-3 font-semibold text-gray-900 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{order.number}</span>
                          {order.has_warning && (
                            <span title="Customer has warnings">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-gray-900">
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-[11px] text-gray-500">
                          {order.customer_phone_local || '—'}{' '}
                          {order.delivery_city && `• ${order.delivery_city}`}
                        </div>
                      </td>

                      <td className="px-3 py-3 font-bold text-gray-900 font-mono">
                        <MoneyDisplay amount={order.total} />
                      </td>

                      <td className="px-3 py-3">
                        <Badge tone={order.status.tone || 'neutral'}>{order.status.label}</Badge>
                      </td>

                      <td className="px-3 py-3">
                        <Badge tone={order.payment_status.tone || 'neutral'}>
                          {order.payment_status.label}
                        </Badge>
                      </td>

                      <td className="px-3 py-3">
                        <span className="capitalize font-medium text-gray-700">
                          {order.seller.label}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-gray-600 font-mono text-[11px]">
                        {order.tracking_number || '—'}
                      </td>

                      <td className="px-3 py-3 text-right text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/shops/${parsedShopId}/orders/${order.id}`)}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2 cursor-pointer hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 font-mono text-sm">{order.number}</span>
                    {order.has_warning && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <MoneyDisplay amount={order.total} className="text-sm font-bold" />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-medium">{order.customer_name}</span>
                  <span>{order.customer_phone_local}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={order.status.tone || 'neutral'} size="sm">
                      {order.status.label}
                    </Badge>
                    <Badge tone={order.payment_status.tone || 'neutral'} size="sm">
                      {order.payment_status.label}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-gray-400">{formatDate(order.created_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200 text-xs text-gray-600 shadow-2xs">
              <div>
                Showing page <span className="font-semibold">{meta.current_page}</span> of{' '}
                <span className="font-semibold">{meta.last_page}</span> ({meta.total} orders)
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
