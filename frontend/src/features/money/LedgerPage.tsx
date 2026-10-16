import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getLedger, createLedgerEntry } from '@/api/finance'
import { useAuth } from '@/app/authContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/toast'
import { formatDate, todayYmd } from '@/lib/date'
import { hasPermission } from '@/lib/permissions'
import { Plus } from 'lucide-react'

export function LedgerPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const { me } = useAuth()
  const canManageLedger = hasPermission('ledger.manage', me)

  // Filters
  const [partyFilter, setPartyFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  // Manual entry dialog
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [entryType, setEntryType] = useState<'shop_payment' | 'gloma_fee' | 'payout' | 'adjustment'>('shop_payment')
  const [amount, setAmount] = useState('')
  const [party, setParty] = useState<string>('shop')
  const [description, setDescription] = useState('')
  const [occurredOn, setOccurredOn] = useState(() => todayYmd())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ledger', parsedShopId, { partyFilter, typeFilter, page }],
    queryFn: () =>
      getLedger(parsedShopId, {
        party: partyFilter || undefined,
        type: typeFilter || undefined,
        page,
        per_page: 50,
      }),
    enabled: parsedShopId > 0,
  })

  const entries = data?.data || []
  const summary = data?.summary

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount.trim() || !description.trim()) {
      toast.show('Amount and description are required.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await createLedgerEntry(parsedShopId, {
        type: entryType,
        amount: amount.trim(),
        party: entryType === 'adjustment' ? party : undefined,
        description: description.trim(),
        occurred_on: occurredOn || undefined,
      })
      toast.show('Ledger entry added successfully.', 'success')
      setIsEntryDialogOpen(false)
      setAmount('')
      setDescription('')
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to add ledger entry.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Money & Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable statement of funds held, stock investment, fees, and remittances
          </p>
        </div>

        {canManageLedger && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEntryDialogOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Manual Entry
          </Button>
        )}
      </div>

      {/* Balances Card */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider block">
              Funds Currently Held by Gloma
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              <MoneyDisplay amount={summary.balances.gloma} />
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              Unspent shop investment, sales proceeds collected, pending payouts
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block">
              Funds Currently Held by Shop
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              <MoneyDisplay amount={summary.balances.shop} />
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              Shop sales proceeds collected directly from walk-ins or courier remittances
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-wrap gap-3">
        <select
          value={partyFilter}
          onChange={(e) => {
            setPartyFilter(e.target.value)
            setPage(1)
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Parties</option>
          <option value="gloma">Gloma</option>
          <option value="shop">Shop</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Ledger Types</option>
          <option value="shop_payment">Shop Payment (Money Received)</option>
          <option value="stock_purchase">Stock Purchase</option>
          <option value="order_payment">Order Payment (Customer COD / Prepaid)</option>
          <option value="courier_charge">Courier Charge</option>
          <option value="return_charge">Return Charge</option>
          <option value="gloma_fee">Gloma Fee</option>
          <option value="payout">Payout to Shop</option>
          <option value="adjustment">Manual Adjustment</option>
        </select>
      </div>

      {/* Ledger Table */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No ledger entries found"
          description="Ledger entries are created automatically from stock purchases, customer payments, and admin entries."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Party (Side)</th>
                <th scope="col" className="px-4 py-3">Transaction Type</th>
                <th scope="col" className="px-4 py-3">Description</th>
                <th scope="col" className="px-4 py-3 text-right">Amount (LKR)</th>
                <th scope="col" className="px-4 py-3 text-right">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {entries.map((entry) => {
                const isNegative = entry.direction === 'out' || entry.amount.startsWith('-')
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(entry.occurred_on)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`capitalize font-semibold ${
                          entry.party.value === 'gloma' ? 'text-indigo-700' : 'text-emerald-700'
                        }`}
                      >
                        {entry.party.label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <Badge tone="neutral" size="sm">
                        {entry.type.label}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-gray-800 max-w-sm">
                      <div>{entry.description}</div>
                      {entry.order && (
                        <span className="text-[10px] text-gray-400 font-mono block">
                          Order #{entry.order.number}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                      <span className={isNegative ? 'text-rose-600' : 'text-emerald-600'}>
                        {isNegative ? '' : '+'}
                        <MoneyDisplay amount={entry.amount} />
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right text-gray-400 text-[11px]">
                      {entry.created_by?.name || 'System'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Entry Dialog */}
      {isEntryDialogOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsEntryDialogOpen(false)}
          title="Add Ledger Entry"
          description="Admin manual cash transaction. Affects party balance immediately."
        >
          <form onSubmit={handleCreateEntry} className="space-y-4">
            <Select
              label="Transaction Type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as any)}
              required
            >
              <option value="shop_payment">Shop Payment (Money received from shop)</option>
              <option value="gloma_fee">Gloma Fee (Monthly/Contract fee)</option>
              <option value="payout">Payout (Money paid out to shop)</option>
              <option value="adjustment">Manual Balance Adjustment</option>
            </Select>

            <Input
              label="Amount (LKR)"
              placeholder="e.g. 50000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              helperText={
                entryType === 'adjustment'
                  ? 'Adjustments can be positive or negative.'
                  : 'Enter a positive amount.'
              }
              required
              autoFocus
            />

            {entryType === 'adjustment' && (
              <Select
                label="Whose Account (Side)"
                value={party}
                onChange={(e) => setParty(e.target.value)}
                required
              >
                <option value="gloma">Gloma</option>
                <option value="shop">Shop</option>
              </Select>
            )}

            <Input
              label="Description / Reason"
              placeholder="e.g. Bank wire ref #99812 for initial inventory"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <Input
              label="Occurred On"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEntryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Entry
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
