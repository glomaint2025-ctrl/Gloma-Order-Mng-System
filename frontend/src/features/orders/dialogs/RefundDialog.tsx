import { useState } from 'react'
import { refundOrder } from '@/api/orders'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/lib/toast'
import type { Order } from '@/api/types'

export interface RefundDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  shopId: number
  onSuccess: () => void
}

export function RefundDialog({ isOpen, onClose, order, shopId, onSuccess }: RefundDialogProps) {
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await refundOrder(shopId, order.id, { reference: reference || undefined })
      toast.show('Refund processed. Ledger entry created.', 'info')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to refund order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Process Order Refund"
      description={`Issue a refund for cancelled or returned order #${order.number}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        <Input
          label="Bank / Reversal Reference (Optional)"
          placeholder="e.g. Refund TXN #9910"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          autoFocus
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={isSubmitting}>
            Confirm Refund
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
