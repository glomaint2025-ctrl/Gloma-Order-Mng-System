import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useQuery } from '@tanstack/react-query'
import { getCourierAccounts } from '@/api/settings'
import { dispatchOrder } from '@/api/orders'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/lib/toast'
import type { Order } from '@/api/types'

export interface DispatchDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  shopId: number
  onSuccess: () => void
}

export function DispatchDialog({ isOpen, onClose, order, shopId, onSuccess }: DispatchDialogProps) {
  const [courierAccountId, setCourierAccountId] = useState<number>(0)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [courierCharge, setCourierCharge] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGlomaOrder = order.seller.value === 'gloma'

  const { data: accounts } = useQuery({
    queryKey: ['courier-accounts', shopId, isGlomaOrder ? 'gloma' : 'shop'],
    queryFn: () =>
      getCourierAccounts(shopId, {
        active_only: 1,
        for: isGlomaOrder ? 'gloma' : undefined,
      }),
    enabled: isOpen,
  })

  // Preselect the first account and its default charge once the list arrives (adjust-state-while-rendering).
  if (accounts && accounts.length > 0 && !courierAccountId) {
    setCourierAccountId(accounts[0].id)
    if (accounts[0].default_charge) {
      setCourierCharge(accounts[0].default_charge)
    }
  }

  const handleAccountChange = (id: number) => {
    setCourierAccountId(id)
    const selected = accounts?.find((a) => a.id === id)
    if (selected?.default_charge) {
      setCourierCharge(selected.default_charge)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber.trim()) {
      setError('Tracking number is required.')
      return
    }
    if (!courierAccountId) {
      setError('Please select a courier account.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await dispatchOrder(shopId, order.id, {
        courier_account_id: courierAccountId,
        tracking_number: trackingNumber.trim(),
        courier_charge: courierCharge ? courierCharge : null,
      })
      toast.show('Order handed to courier and tracking link generated.', 'success')
      onSuccess()
      onClose()
    } catch (err) {
      setError(apiError(err).message || 'Failed to dispatch order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Order"
      description={`Hand order #${order.number} to courier for delivery.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        <Select
          label="Courier Account"
          value={courierAccountId}
          onChange={(e) => handleAccountChange(Number(e.target.value))}
          required
        >
          {accounts?.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.courier.name} — {acc.label} {acc.account_ref ? `(${acc.account_ref})` : ''}
            </option>
          ))}
        </Select>

        <Input
          label="Courier Tracking Number"
          placeholder="e.g. PR987654321"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Courier Delivery Charge (LKR)"
          placeholder="e.g. 350.00"
          value={courierCharge}
          onChange={(e) => setCourierCharge(e.target.value)}
          helperText="Prefilled with default account charge, editable if changed"
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Confirm Dispatch
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
