import { useState } from 'react'
import { deliverOrder } from '@/api/orders'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/lib/toast'
import type { Order } from '@/api/types'

export interface DeliverDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  shopId: number
  onSuccess: () => void
}

export function DeliverDialog({ isOpen, onClose, order, shopId, onSuccess }: DeliverDialogProps) {
  const [recordPayment, setRecordPayment] = useState(false)
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await deliverOrder(shopId, order.id, {
        record_payment: recordPayment,
        reference: reference || null,
      })
      toast.show('Order marked as Delivered.', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to mark as delivered.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Order as Delivered"
      description={`Confirm that order #${order.number} has been received by the customer.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={recordPayment}
              onChange={(e) => setRecordPayment(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-xs font-semibold text-gray-900 block">
                Payment collected now (COD remitted)
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                Automatically mark payment as Paid and post a ledger entry to seller.
              </span>
            </div>
          </label>
        </div>

        {recordPayment && (
          <Input
            label="Payment / Bank Reference (Optional)"
            placeholder="e.g. COD Batch #8821"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Confirm Delivery
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
