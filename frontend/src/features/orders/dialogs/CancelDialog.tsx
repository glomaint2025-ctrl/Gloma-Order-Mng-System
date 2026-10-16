import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { cancelOrder } from '@/api/orders'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/lib/toast'
import type { Order } from '@/api/types'

export interface CancelDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  shopId: number
  onSuccess: () => void
}

export function CancelDialog({ isOpen, onClose, order, shopId, onSuccess }: CancelDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await cancelOrder(shopId, order.id, { reason: reason.trim() })
      toast.show('Order cancelled. Stock has been returned.', 'info')
      onSuccess()
      onClose()
    } catch (err) {
      setError(apiError(err).message || 'Failed to cancel order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Order"
      description={`Cancel order #${order.number}. Stock will automatically be restored to the inventory pool.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        <Input
          label="Cancellation Reason"
          placeholder="e.g. Customer changed mind, incorrect address"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={isSubmitting}>
            Confirm Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
