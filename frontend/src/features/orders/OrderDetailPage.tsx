import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOrder, confirmOrder, packOrder, addOrderNote } from '@/api/orders'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { WarningBanner } from '@/components/ui/WarningBanner'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { formatDateTime } from '@/lib/date'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Printer,
  FileText,
  Clock,
  Check,
  Package,
  Send,
  Truck,
  RotateCcw,
  XCircle,
  CreditCard,
  Edit,
  DollarSign,
} from 'lucide-react'

// Action Dialogs
import { DispatchDialog } from './dialogs/DispatchDialog'
import { DeliverDialog } from './dialogs/DeliverDialog'
import { CancelDialog } from './dialogs/CancelDialog'
import { ReturnDialog } from './dialogs/ReturnDialog'
import { RecordPaymentDialog } from './dialogs/RecordPaymentDialog'
import { RefundDialog } from './dialogs/RefundDialog'

export function OrderDetailPage() {
  const { shopId, orderId } = useParams<{ shopId: string; orderId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const parsedOrderId = parseInt(orderId || '0', 10)
  const navigate = useNavigate()

  const [activeDialog, setActiveDialog] = useState<
    'dispatch' | 'deliver' | 'cancel' | 'return' | 'record_payment' | 'refund' | null
  >(null)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['order', parsedShopId, parsedOrderId],
    queryFn: () => getOrder(parsedShopId, parsedOrderId),
    enabled: parsedShopId > 0 && parsedOrderId > 0,
  })

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
        <h3 className="text-base font-bold text-gray-900">Order not found</h3>
        <p className="text-xs text-gray-500 mt-1">
          This order does not exist or belongs to another shop.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate(`/shops/${parsedShopId}/orders`)}
        >
          Back to Orders
        </Button>
      </div>
    )
  }

  const actions = order.available_actions || []

  const handleConfirm = async () => {
    setIsActionLoading(true)
    try {
      await confirmOrder(parsedShopId, order.id)
      toast.show('Order confirmed after customer phone call.', 'success')
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to confirm order.', 'danger')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePack = async () => {
    setIsActionLoading(true)
    try {
      await packOrder(parsedShopId, order.id)
      toast.show('Order marked as Packed and ready for dispatch.', 'success')
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to pack order.', 'danger')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setIsAddingNote(true)
    try {
      await addOrderNote(parsedShopId, order.id, newNote.trim())
      setNewNote('')
      toast.show('Note added to order.', 'success')
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to add note.', 'danger')
    } finally {
      setIsAddingNote(false)
    }
  }

  const openPdf = (type: 'invoice' | 'label') => {
    window.open(`/api/v1/shops/${parsedShopId}/orders/${order.id}/${type}.pdf`, '_blank')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/shops/${parsedShopId}/orders`)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 font-mono tracking-tight">
                {order.number}
              </h1>
              <Badge tone={order.status.tone || 'neutral'}>{order.status.label}</Badge>
              <Badge tone={order.payment_status.tone || 'neutral'}>
                {order.payment_status.label}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Channel: <strong className="font-semibold text-gray-700">{order.channel.label}</strong></span>
              <span>&bull;</span>
              <span>Seller: <strong className="font-semibold text-gray-700">{order.seller.label}</strong></span>
              {order.placed_by && (
                <>
                  <span>&bull;</span>
                  <span>Placed by: <strong className="font-semibold text-gray-700">{order.placed_by.name}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar - ONLY actions present in available_actions */}
        <div className="flex flex-wrap items-center gap-2">
          {actions.includes('confirm') && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isActionLoading}
              onClick={handleConfirm}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Confirm (Called Customer)
            </Button>
          )}

          {actions.includes('pack') && (
            <Button
              variant="primary"
              size="sm"
              isLoading={isActionLoading}
              onClick={handlePack}
              icon={<Package className="w-3.5 h-3.5" />}
            >
              Pack Order
            </Button>
          )}

          {actions.includes('dispatch') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveDialog('dispatch')}
              icon={<Truck className="w-3.5 h-3.5" />}
            >
              Hand to Courier
            </Button>
          )}

          {actions.includes('deliver') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveDialog('deliver')}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Mark Delivered
            </Button>
          )}

          {actions.includes('record_payment') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveDialog('record_payment')}
              icon={<CreditCard className="w-3.5 h-3.5" />}
            >
              Record Payment
            </Button>
          )}

          {actions.includes('edit') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/shops/${parsedShopId}/orders/${order.id}/edit`)}
              icon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit
            </Button>
          )}

          {actions.includes('cancel') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDialog('cancel')}
              icon={<XCircle className="w-3.5 h-3.5 text-red-600" />}
            >
              Cancel
            </Button>
          )}

          {actions.includes('return') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDialog('return')}
              icon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
            >
              Mark Returned
            </Button>
          )}

          {actions.includes('refund') && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setActiveDialog('refund')}
              icon={<DollarSign className="w-3.5 h-3.5" />}
            >
              Refund
            </Button>
          )}

          {actions.includes('print_label') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPdf('label')}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              Print Label
            </Button>
          )}

          {actions.includes('print_invoice') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPdf('invoice')}
              icon={<FileText className="w-3.5 h-3.5" />}
            >
              Print Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Warnings Banner */}
      {order.warnings && order.warnings.length > 0 && (
        <WarningBanner warnings={order.warnings} />
      )}

      {/* Grid: Left Column (Customer & Items) + Right Column (Shipping, Payments, Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Items & Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Customer Details
            </h2>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">
                  {order.customer.name || 'Walk-in Customer'}
                </span>
                {order.customer.phone && (
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.customer.phone_local || order.customer.phone}
                  </a>
                )}
              </div>

              {order.customer.address && (
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {order.customer.address}
                    {order.customer.city && `, ${order.customer.city}`}
                  </span>
                </div>
              )}

              {order.customer.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={`mailto:${order.customer.email}`} className="hover:underline">
                    {order.customer.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Order Items ({order.items.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Item</th>
                    <th scope="col" className="px-4 py-2.5">Location</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Qty</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Price</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{item.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">SKU: {item.sku}</div>
                        {(item.returned_good_qty > 0 || item.returned_damaged_qty > 0) && (
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            Returned: {item.returned_good_qty} good, {item.returned_damaged_qty} damaged
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {item.location.label}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">
                        {item.qty}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 font-mono">
                        <MoneyDisplay amount={item.unit_price} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                        <MoneyDisplay amount={item.line_total} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="p-4 bg-gray-50/75 border-t border-gray-100 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <MoneyDisplay amount={order.totals.subtotal} />
              </div>
              {order.totals.discount !== '0.00' && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-<MoneyDisplay amount={order.totals.discount} /></span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee:</span>
                <MoneyDisplay amount={order.totals.delivery_fee} />
              </div>
              {order.return_charge && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Return Charge:</span>
                  <MoneyDisplay amount={order.return_charge} />
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Amount:</span>
                <MoneyDisplay amount={order.totals.total} className="text-base text-indigo-700" />
              </div>
            </div>
          </div>

          {/* Cancellation or Return Reason if present */}
          {order.cancel_reason && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs">
              <span className="font-semibold text-red-800 block">Cancellation Reason:</span>
              <p className="text-red-700 mt-1">{order.cancel_reason}</p>
            </div>
          )}

          {order.return_reason && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <span className="font-semibold text-amber-800 block">Return Reason:</span>
              <p className="text-amber-700 mt-1">{order.return_reason}</p>
            </div>
          )}

          {/* Internal Notes Section */}
          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Internal Notes
            </h2>

            <div className="space-y-3">
              {order.notes?.map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                  <p className="text-gray-800 whitespace-pre-wrap">{n.body}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                    <span className="font-semibold text-gray-600">{n.user?.name || 'System'}</span>
                    <span>&bull;</span>
                    <span>{formatDateTime(n.created_at)}</span>
                  </div>
                </div>
              ))}

              {(!order.notes || order.notes.length === 0) && (
                <p className="text-xs text-gray-400 italic">No notes added yet.</p>
              )}
            </div>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="flex gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Add an internal note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-gray-300 p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isAddingNote}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side: Shipping, Payment, Timeline */}
        <div className="space-y-6">
          {/* Shipping Details Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Shipping Information
            </h2>

            {order.shipping?.tracking_number ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Courier:</span>
                  <span className="font-semibold text-gray-900">
                    {order.shipping.courier?.name} ({order.shipping.courier_account?.label})
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">Tracking Number:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {order.shipping.tracking_number}
                  </span>
                </div>

                {order.shipping.tracking_url && (
                  <div className="pt-1">
                    <a
                      href={order.shipping.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Track Package <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {order.shipping.courier_charge && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-400 block text-[11px]">Courier Charge:</span>
                    <MoneyDisplay amount={order.shipping.courier_charge} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Not handed to courier yet.</p>
            )}
          </div>

          {/* Payments Details Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Payment Transactions
            </h2>

            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-500">Selected Method:</span>
                <span className="font-semibold text-gray-900">
                  {order.payment_method?.name} ({order.payment_method?.kind.label})
                </span>
              </div>

              {order.payments?.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="capitalize">{p.kind}</span>
                    <MoneyDisplay amount={p.amount} />
                  </div>
                  {p.reference && (
                    <div className="text-[11px] text-gray-500">Ref: {p.reference}</div>
                  )}
                  {p.has_slip && (
                    <div>
                      <a
                        href={`/api/v1/shops/${parsedShopId}/orders/${order.id}/payments/${p.id}/slip`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        View Deposit Slip <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400">{formatDateTime(p.paid_at)}</div>
                </div>
              ))}

              {(!order.payments || order.payments.length === 0) && (
                <p className="text-xs text-gray-400 italic">No payments recorded yet.</p>
              )}
            </div>
          </div>

          {/* Timeline / Audit Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Timeline
            </h2>

            <div className="relative pl-4 space-y-3 border-l-2 border-gray-200 text-xs">
              {order.timeline?.map((evt) => (
                <div key={evt.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="font-semibold text-gray-800">{evt.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {evt.user?.name ? `${evt.user.name} • ` : ''}
                    {formatDateTime(evt.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Dialogs */}
      {activeDialog === 'dispatch' && (
        <DispatchDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          order={order}
          shopId={parsedShopId}
          onSuccess={refetch}
        />
      )}

      {activeDialog === 'deliver' && (
        <DeliverDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          order={order}
          shopId={parsedShopId}
          onSuccess={refetch}
        />
      )}

      {activeDialog === 'cancel' && (
        <CancelDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          order={order}
          shopId={parsedShopId}
          onSuccess={refetch}
        />
      )}

      {activeDialog === 'return' && (
        <ReturnDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          order={order}
          shopId={parsedShopId}
          onSuccess={refetch}
        />
      )}

      {activeDialog === 'record_payment' && (
        <RecordPaymentDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          order={order}
          shopId={parsedShopId}
          onSuccess={refetch}
        />
      )}

      {activeDialog === 'refund' && (
        <RefundDialog
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          order={order}
          shopId={parsedShopId}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}
