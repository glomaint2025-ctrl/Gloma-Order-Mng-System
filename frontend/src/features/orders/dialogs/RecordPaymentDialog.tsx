import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useQuery } from '@tanstack/react-query'
import { getPaymentMethods } from '@/api/settings'
import { recordPayment } from '@/api/orders'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { toast } from '@/lib/toast'
import type { Order } from '@/api/types'

export interface RecordPaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  shopId: number
  onSuccess: () => void
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  order,
  shopId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [paymentMethodId, setPaymentMethodId] = useState<number>(order.payment_method?.id || 0)
  const [reference, setReference] = useState('')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: methods } = useQuery({
    queryKey: ['payment-methods', shopId],
    queryFn: () => getPaymentMethods(shopId, { active_only: 1 }),
    enabled: isOpen,
  })

  const selectedMethod = methods?.find((m) => m.id === paymentMethodId) || order.payment_method
  const requiresSlip = selectedMethod?.requires_slip

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requiresSlip && !slipFile) {
      setError('This payment method requires a deposit slip or receipt upload.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    if (paymentMethodId) {
      formData.append('payment_method_id', String(paymentMethodId))
    }
    if (reference.trim()) {
      formData.append('reference', reference.trim())
    }
    if (slipFile) {
      formData.append('slip', slipFile)
    }

    try {
      await recordPayment(shopId, order.id, formData)
      toast.show('Payment recorded successfully.', 'success')
      onSuccess()
      onClose()
    } catch (err) {
      setError(apiError(err).message || 'Failed to record payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      description={`Record payment of for order #${order.number}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">Order Total:</span>
          <MoneyDisplay amount={order.totals.total} className="text-sm font-bold text-gray-900" />
        </div>

        <Select
          label="Payment Method"
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(Number(e.target.value))}
        >
          {methods?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.kind.label}) {m.requires_slip ? '— Slip Required' : ''}
            </option>
          ))}
        </Select>

        <Input
          label="Payment Reference / Slip #"
          placeholder="e.g. Bank Ref #44129"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Deposit Slip or Receipt {requiresSlip && <span className="text-red-500">*</span>}
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.webp"
            onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-gray-300 rounded-lg"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            JPG, PNG, WebP or PDF format up to 5 MB.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Record Payment
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
