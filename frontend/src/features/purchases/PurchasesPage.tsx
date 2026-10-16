import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPurchases, getPurchase, createPurchase } from '@/api/purchases'
import { getProducts } from '@/api/products'
import { useAuth } from '@/app/authContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date'
import { toCents, fromCents } from '@/lib/money'
import { hasPermission } from '@/lib/permissions'
import { Plus, Trash2, Eye } from 'lucide-react'

interface PurchaseLineInput {
  product_id: number
  qty: number
  unit_cost: string
  location?: string
}

export function PurchasesPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const { me, currentShop } = useAuth()
  const canManageStock = hasPermission('stock.manage', me)
  const isByLocation = currentShop?.stock_mode.value === 'by_location'

  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [purchasedOn, setPurchasedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<PurchaseLineInput[]>([
    { product_id: 0, qty: 10, unit_cost: '1000.00', location: isByLocation ? 'gloma' : undefined },
  ])

  // Fetch purchases list
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchases', parsedShopId, page],
    queryFn: () => getPurchases(parsedShopId, { page, per_page: 25 }),
    enabled: parsedShopId > 0,
  })

  // Fetch active products for line dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products-for-purchase', parsedShopId],
    queryFn: () => getProducts(parsedShopId, { per_page: 100 }),
    enabled: isCreateOpen && parsedShopId > 0,
  })

  // Fetch purchase detail when selected
  const { data: purchaseDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['purchase-detail', parsedShopId, selectedPurchaseId],
    queryFn: () => getPurchase(parsedShopId, selectedPurchaseId!),
    enabled: Boolean(selectedPurchaseId),
  })

  const purchases = data?.data || []
  const products = productsData?.data || []

  // Live total calculation with integer cents
  const runningTotal = useMemo(() => {
    let totalCents = 0
    lines.forEach((l) => {
      const unitCents = toCents(l.unit_cost || '0')
      totalCents += unitCents * (l.qty || 0)
    })
    return fromCents(totalCents)
  }, [lines])

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { product_id: products[0]?.id || 0, qty: 10, unit_cost: '1000.00', location: isByLocation ? 'gloma' : undefined },
    ])
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, updates: Partial<PurchaseLineInput>) => {
    setLines((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lines.length === 0 || lines.some((l) => !l.product_id || l.qty <= 0)) {
      toast.show('Please select a valid product and quantity for each line.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await createPurchase(parsedShopId, {
        purchased_on: purchasedOn,
        reference: reference.trim() || null,
        supplier: supplier.trim() || null,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          product_id: Number(l.product_id),
          qty: Number(l.qty),
          unit_cost: l.unit_cost,
          location: isByLocation ? l.location : undefined,
        })),
      })
      toast.show('Stock purchase recorded and stock levels updated.', 'success')
      setIsCreateOpen(false)
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to record purchase.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Stock Purchases</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log inventory purchased with shop investment funds
          </p>
        </div>

        {canManageStock && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (products.length > 0) {
                setLines([
                  {
                    product_id: products[0].id,
                    qty: 10,
                    unit_cost: products[0].avg_cost || '1000.00',
                    location: isByLocation ? 'gloma' : undefined,
                  },
                ])
              }
              setIsCreateOpen(true)
            }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Record Purchase
          </Button>
        )}
      </div>

      {/* Purchases List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : purchases.length === 0 ? (
        <EmptyState
          title="No purchases recorded"
          description="Purchases fund inventory from the shop's invested capital."
          action={
            canManageStock ? (
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                Record First Purchase
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Reference #</th>
                <th scope="col" className="px-4 py-3">Supplier</th>
                <th scope="col" className="px-4 py-3 text-center">Lines</th>
                <th scope="col" className="px-4 py-3 text-right">Total Amount</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {purchases.map((purchase) => (
                <tr
                  key={purchase.id}
                  onClick={() => setSelectedPurchaseId(purchase.id)}
                  className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDate(purchase.purchased_on)}
                  </td>

                  <td className="px-4 py-3 font-semibold text-gray-900 font-mono">
                    {purchase.reference || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {purchase.supplier || '—'}
                  </td>

                  <td className="px-4 py-3 text-center font-medium text-gray-600">
                    {purchase.lines_count ?? '—'}
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                    <MoneyDisplay amount={purchase.total} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPurchaseId(purchase.id)
                      }}
                      icon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.meta && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1 pt-2">
          <span>
            Page {data.meta.current_page} of {data.meta.last_page} ({data.meta.total} purchases)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.meta.current_page >= data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Record Purchase Dialog */}
      {isCreateOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Record Stock Purchase"
          description="Enter purchased items. Stock levels will increase and an entry will be logged in the Money Ledger."
          maxWidth="2xl"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Date Purchased"
                type="date"
                value={purchasedOn}
                onChange={(e) => setPurchasedOn(e.target.value)}
                required
              />

              <Input
                label="Invoice / Supplier Ref"
                placeholder="e.g. INV-2026-09"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />

              <Input
                label="Supplier Name"
                placeholder="e.g. Apparel Lanka Ltd"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Purchase Lines */}
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Purchase Lines
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Line
                </Button>
              </div>

              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-end gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Product
                      </label>
                      <select
                        className="w-full rounded border border-gray-300 p-1.5 bg-white text-xs"
                        value={line.product_id}
                        onChange={(e) => updateLine(idx, { product_id: Number(e.target.value) })}
                      >
                        <option value={0}>Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-20">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full rounded border border-gray-300 p-1.5 bg-white text-center font-bold"
                        value={line.qty}
                        onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                        Unit Cost (LKR)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 p-1.5 bg-white text-right font-mono"
                        value={line.unit_cost}
                        onChange={(e) => updateLine(idx, { unit_cost: e.target.value })}
                      />
                    </div>

                    {isByLocation && (
                      <div className="w-24">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                          Location
                        </label>
                        <select
                          className="w-full rounded border border-gray-300 p-1.5 bg-white text-xs"
                          value={line.location || 'gloma'}
                          onChange={(e) => updateLine(idx, { location: e.target.value })}
                        >
                          <option value="gloma">Gloma</option>
                          <option value="shop">Shop</option>
                        </select>
                      </div>
                    )}

                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded cursor-pointer self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="Notes (Optional)"
              placeholder="Payment terms, delivery notes, or batch code"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {/* Running Total Bar */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Total Purchase Value:</span>
              <MoneyDisplay amount={runningTotal} className="text-lg font-bold text-indigo-700" />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Purchase
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Purchase Detail Modal */}
      {selectedPurchaseId && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedPurchaseId(null)}
          title={`Purchase #${purchaseDetail?.reference || purchaseDetail?.id}`}
          description="Purchased stock items and supplier reference."
          maxWidth="lg"
        >
          {isDetailLoading || !purchaseDetail ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[11px]">Supplier:</span>
                  <span className="font-semibold text-gray-800">{purchaseDetail.supplier || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Purchased Date:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(purchaseDetail.purchased_on)}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-gray-700 mb-1.5 block">Itemized Lines</span>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                  {purchaseDetail.lines?.map((line) => (
                    <div key={line.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900 block">{line.product.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          SKU: {line.product.sku} &bull; {line.location.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">
                          {line.qty} &times; <MoneyDisplay amount={line.unit_cost} />
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono block">
                          = <MoneyDisplay amount={line.line_total} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between text-xs font-semibold">
                <span>Total Amount:</span>
                <MoneyDisplay amount={purchaseDetail.total} className="text-base text-indigo-700" />
              </div>

              {purchaseDetail.notes && (
                <div className="p-2.5 rounded bg-gray-50 text-gray-600">
                  <span className="font-semibold text-gray-700 block">Notes:</span>
                  {purchaseDetail.notes}
                </div>
              )}
            </div>
          )}
        </Dialog>
      )}
    </div>
  )
}
