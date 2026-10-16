import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ShieldCheck, Trash2 } from 'lucide-react'
import { eraseCustomer } from '@/api/customers'
import { downloadFile } from '@/api/download'
import { apiError } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'

/**
 * PDPA data-subject requests (Gloma admin only): download everything held about the customer, or erase them.
 * Erasing keeps order amounts and the money ledger (accounting records); only personal details go.
 */
export function CustomerPrivacyCard({ shopId, customerId, customerName }: { shopId: number; customerId: number; customerName: string }) {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [erasing, setErasing] = useState(false)

  const download = async () => {
    setDownloading(true)
    try {
      await downloadFile(`/shops/${shopId}/customers/${customerId}/export`, undefined, `customer-${customerId}-data.json`)
    } catch (err) {
      toast.show(apiError(err).message ?? 'Download failed.', 'danger')
    } finally {
      setDownloading(false)
    }
  }

  const erase = async () => {
    setErasing(true)
    try {
      const res = await eraseCustomer(shopId, customerId, reason.trim())
      toast.show(res.message, 'success')
      navigate(`/shops/${shopId}/customers`)
    } catch (err) {
      toast.show(apiError(err).message ?? 'Could not erase the customer.', 'danger')
    } finally {
      setErasing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-indigo-600" />
        Personal data (PDPA)
      </h2>
      <p className="text-xs text-gray-500 mt-1">
        Use these only when the customer asks for a copy of their data or asks to be removed.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" isLoading={downloading} onClick={download} icon={<Download className="w-3.5 h-3.5" />}>
          Download their data
        </Button>
        <Button variant="danger" size="sm" onClick={() => setOpen(true)} icon={<Trash2 className="w-3.5 h-3.5" />}>
          Erase customer
        </Button>
      </div>

      {open && (
        <Dialog
          isOpen
          onClose={() => setOpen(false)}
          title={`Erase ${customerName}?`}
          description="This removes their name, phone, email, address and notes from this shop for good. Order totals and money records stay for the accounts. This cannot be undone."
        >
          <div className="space-y-4">
            <Input label="Reason (for the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer asked by email on 17 Oct" required />
            <Input label='Type ERASE to confirm' value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Keep customer
              </Button>
              <Button variant="danger" size="sm" isLoading={erasing} disabled={typed !== 'ERASE' || reason.trim() === ''} onClick={erase}>
                Erase for good
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
