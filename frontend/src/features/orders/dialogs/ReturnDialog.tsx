import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { returnOrder } from '@/api/orders'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/lib/toast'
import type { Order } from '@/api/types'

export interface ReturnDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  shopId: number
  onSuccess: () => void
}

export function ReturnDialog({ isOpen, onClose, order, shopId, onSuccess }: ReturnDialogProps) {
  const [reason, setReason] = useState('')
  const [returnCharge, setReturnCharge] = useState('')
  const [damagedQuantities, setDamagedQuantities] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {}
    order.items.forEach((item) => {
      init[item.id] = 0
    })
    return init
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Return reason is required.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const itemsPayload = order.items.map((item) => ({
      order_item_id: item.id,
      damaged_qty: damagedQuantities[item.id] || 0,
    }))

    try {
      await returnOrder(shopId, order.id, {
        reason: reason.trim(),
        return_charge: returnCharge ? returnCharge : null,
        items: itemsPayload,
      })
      toast.show('Order marked as Returned. Good items returned to stock.', 'warning')
      onSuccess()
      onClose()
    } catch (err) {
      setError(apiError(err).message || 'Failed to process return.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Process Order Return"
      description={`Record return for order #${order.number}. Good units return to stock; damaged units are written off.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        <Input
          label="Return Reason"
          placeholder="e.g. Courier failed to deliver, customer rejected parcel"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Return Fee / Courier Return Charge (Optional)"
          placeholder="e.g. 200.00"
          value={returnCharge}
          onChange={(e) => setReturnCharge(e.target.value)}
          helperText="Charged against the shop ledger if applicable"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
            Item Condition (Damaged Quantities)
          </label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-gray-50">
            {order.items.map((item) => {
              const damaged = damagedQuantities[item.id] || 0
              const good = Math.max(0, item.qty - damaged)

              return (
                <div key={item.id} className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">{item.name}</span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      SKU: {item.sku} &bull; Ordered: {item.qty} units
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-emerald-700 font-semibold block">
                        {good} good (restock)
                      </span>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        max={item.qty}
                        value={damaged}
                        onChange={(e) =>
                          setDamagedQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.min(item.qty, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        className="w-full text-xs rounded border border-gray-300 p-1.5 bg-white text-center font-bold"
                        title="Damaged quantity"
                      />
                      <span className="text-[9px] text-gray-400 block text-center mt-0.5">damaged qty</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={isSubmitting}>
            Confirm Return
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
