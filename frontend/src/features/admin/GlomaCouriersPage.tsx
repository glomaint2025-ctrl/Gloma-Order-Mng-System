import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getGlomaCourierAccounts,
  createGlomaCourierAccount,
  updateGlomaCourierAccount,
  getAdminCouriers,
} from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/toast'
import { Plus, Edit2 } from 'lucide-react'
import type { CourierAccount } from '@/api/types'

export function GlomaCouriersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<CourierAccount | null>(null)
  const [courierId, setCourierId] = useState<number>(0)
  const [label, setLabel] = useState('')
  const [accountRef, setAccountRef] = useState('')
  const [defaultCharge, setDefaultCharge] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ['admin-gloma-courier-accounts'],
    queryFn: getGlomaCourierAccounts,
  })

  const { data: couriers } = useQuery({
    queryKey: ['admin-couriers'],
    queryFn: getAdminCouriers,
  })

  const openCreate = () => {
    setEditingAccount(null)
    setCourierId(couriers?.[0]?.id || 0)
    setLabel('')
    setAccountRef('')
    setDefaultCharge('')
    setIsActive(true)
    setIsDialogOpen(true)
  }

  const openEdit = (account: CourierAccount) => {
    setEditingAccount(account)
    setCourierId(account.courier.id)
    setLabel(account.label)
    setAccountRef(account.account_ref || '')
    setDefaultCharge(account.default_charge || '')
    setIsActive(account.is_active)
    setIsDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !courierId) return

    setIsSubmitting(true)
    try {
      if (editingAccount) {
        await updateGlomaCourierAccount(editingAccount.id, {
          courier_id: courierId,
          label: label.trim(),
          account_ref: accountRef.trim() || null,
          default_charge: defaultCharge.trim() || null,
          is_active: isActive,
        })
        toast.show('Gloma courier account updated.', 'success')
      } else {
        await createGlomaCourierAccount({
          courier_id: courierId,
          label: label.trim(),
          account_ref: accountRef.trim() || null,
          default_charge: defaultCharge.trim() || null,
          is_active: isActive,
        })
        toast.show('Gloma courier account created.', 'success')
      }
      setIsDialogOpen(false)
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to save account.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gloma Courier Accounts</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gloma central accounts used when dispatching orders sold through the Gloma channel
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Gloma Account
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : accounts?.length === 0 ? (
        <EmptyState
          title="No accounts configured"
          description="Gloma accounts are used when Gloma acts as the seller."
          action={
            <Button variant="primary" size="sm" onClick={openCreate}>
              Add Account
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {accounts?.map((acc) => (
              <div key={acc.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {acc.courier.name} &bull; {acc.label}
                    </span>
                    {acc.account_ref && (
                      <span className="text-gray-400 font-mono text-[11px]">
                        ({acc.account_ref})
                      </span>
                    )}
                  </div>
                  {acc.default_charge && (
                    <span className="text-gray-500 text-[11px] mt-0.5 block">
                      Default Delivery Charge: <MoneyDisplay amount={acc.default_charge} />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={acc.is_active ? 'success' : 'neutral'} size="sm">
                    {acc.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(acc)}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDialogOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsDialogOpen(false)}
          title={editingAccount ? 'Edit Gloma Account' : 'Add Gloma Account'}
          description="Central Gloma courier account."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Select
              label="Courier"
              value={courierId}
              onChange={(e) => setCourierId(Number(e.target.value))}
              required
            >
              {couriers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>

            <Input
              label="Account Label"
              placeholder="e.g. Gloma Central Hub"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Client ID / Account Ref (Optional)"
              placeholder="e.g. GLM-PRNT-998"
              value={accountRef}
              onChange={(e) => setAccountRef(e.target.value)}
            />

            <Input
              label="Default Charge (LKR)"
              placeholder="350.00"
              value={defaultCharge}
              onChange={(e) => setDefaultCharge(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Account
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
