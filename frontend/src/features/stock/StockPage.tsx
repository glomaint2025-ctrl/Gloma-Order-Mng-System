import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '@/api/products'
import { getStockMovements, adjustStock, transferStock, switchStockMode } from '@/api/stock'
import { useAuth } from '@/app/authContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/toast'
import { formatDateTime } from '@/lib/date'
import { hasPermission } from '@/lib/permissions'
import { ArrowRightLeft, Sliders, Wrench } from 'lucide-react'

export function StockPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const { me, currentShop, refreshMe } = useAuth()
  const canManageStock = hasPermission('stock.manage', me)
  const isByLocationMode = currentShop?.stock_mode.value === 'by_location'

  const [activeTab, setActiveTab] = useState<'levels' | 'movements'>('levels')

  // Movements filter state
  const [movementProductFilter, setMovementProductFilter] = useState<number | undefined>(undefined)
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('')
  const [movementLocationFilter, setMovementLocationFilter] = useState<string>('')

  // Dialog states
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isModeOpen, setIsModeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Adjust form state
  const [adjustProductId, setAdjustProductId] = useState<number>(0)
  const [adjustType, setAdjustType] = useState<'correction' | 'damage' | 'handover'>('correction')
  const [adjustQty, setAdjustQty] = useState<string>('0')
  const [adjustLocation, setAdjustLocation] = useState<string>('shared')
  const [adjustReason, setAdjustReason] = useState<string>('')

  // Transfer form state
  const [transferProductId, setTransferProductId] = useState<number>(0)
  const [transferFrom, setTransferFrom] = useState<'gloma' | 'shop'>('gloma')
  const [transferTo, setTransferTo] = useState<'gloma' | 'shop'>('shop')
  const [transferQty, setTransferQty] = useState<string>('1')
  const [transferReason, setTransferReason] = useState<string>('')

  // Switch mode form state
  const [targetStockMode, setTargetStockMode] = useState<'single' | 'by_location'>(
    isByLocationMode ? 'single' : 'by_location'
  )
  const [splitMap, setSplitMap] = useState<Record<number, { gloma: number; shop: number }>>({})

  // Fetch product stock levels
  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products-stock', parsedShopId],
    queryFn: () => getProducts(parsedShopId, { per_page: 100 }),
    enabled: parsedShopId > 0,
  })

  // Fetch stock movements
  const {
    data: movementsData,
    isLoading: isMovementsLoading,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: [
      'stock-movements',
      parsedShopId,
      { movementProductFilter, movementTypeFilter, movementLocationFilter },
    ],
    queryFn: () =>
      getStockMovements(parsedShopId, {
        product_id: movementProductFilter,
        type: movementTypeFilter || undefined,
        location: movementLocationFilter || undefined,
        per_page: 50,
      }),
    enabled: parsedShopId > 0 && activeTab === 'movements',
  })

  const products = productsData?.data || []
  const movements = movementsData?.data || []

  // Initialize split map when opening mode dialog
  const openModeDialog = () => {
    const init: Record<number, { gloma: number; shop: number }> = {}
    products.forEach((p) => {
      init[p.id] = { gloma: p.stock.total, shop: 0 }
    })
    setSplitMap(init)
    setTargetStockMode(isByLocationMode ? 'single' : 'by_location')
    setIsModeOpen(true)
  }

  // Handle Adjustment Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustProductId) {
      toast.show('Please select a product.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await adjustStock(parsedShopId, {
        product_id: adjustProductId,
        type: adjustType,
        qty: parseInt(adjustQty, 10),
        location: isByLocationMode ? adjustLocation : undefined,
        reason: adjustReason.trim() || undefined,
      })
      toast.show('Stock adjustment recorded successfully.', 'success')
      setIsAdjustOpen(false)
      refetchProducts()
      if (activeTab === 'movements') refetchMovements()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to adjust stock.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferProductId) {
      toast.show('Please select a product.', 'warning')
      return
    }
    if (transferFrom === transferTo) {
      toast.show('Transfer source and destination must be different.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await transferStock(parsedShopId, {
        product_id: transferProductId,
        from: transferFrom,
        to: transferTo,
        qty: parseInt(transferQty, 10),
        reason: transferReason.trim() || undefined,
      })
      toast.show('Stock transfer completed successfully.', 'success')
      setIsTransferOpen(false)
      refetchProducts()
      if (activeTab === 'movements') refetchMovements()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to transfer stock.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Mode Switch Submit
  const handleModeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate splits add up to total if switching to by_location
    if (targetStockMode === 'by_location') {
      for (const p of products) {
        const split = splitMap[p.id] || { gloma: 0, shop: 0 }
        if (split.gloma + split.shop !== p.stock.total) {
          toast.show(
            `Split for "${p.name}" (${split.gloma} + ${split.shop} = ${split.gloma + split.shop}) does not equal total (${p.stock.total}).`,
            'danger'
          )
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      const splitPayload =
        targetStockMode === 'by_location'
          ? products.map((p) => ({
              product_id: p.id,
              gloma: splitMap[p.id]?.gloma || 0,
              shop: splitMap[p.id]?.shop || 0,
            }))
          : undefined

      await switchStockMode(parsedShopId, {
        stock_mode: targetStockMode,
        split: splitPayload,
      })
      toast.show(`Stock mode switched to ${targetStockMode}.`, 'success')
      setIsModeOpen(false)
      await refreshMe()
      refetchProducts()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to switch stock mode.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header and Admin Stock Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Stock Inventory</h1>
            <Badge tone="primary" size="sm">
              Mode: {currentShop?.stock_mode.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Physical units count, location tracking, and immutable stock movements
          </p>
        </div>

        {canManageStock && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustProductId(products[0]?.id || 0)
                setIsAdjustOpen(true)
              }}
              icon={<Wrench className="w-3.5 h-3.5" />}
            >
              Adjust Stock
            </Button>

            {isByLocationMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTransferProductId(products[0]?.id || 0)
                  setIsTransferOpen(true)
                }}
                icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
              >
                Transfer Stock
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={openModeDialog}
              icon={<Sliders className="w-3.5 h-3.5" />}
            >
              Switch Mode
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('levels')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'levels'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Stock Levels per Location
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'movements'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Stock Movements Ledger
        </button>
      </div>

      {/* Tab 1: Levels Table */}
      {activeTab === 'levels' && (
        <>
          {isProductsLoading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" className="text-indigo-600" />
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products or stock found"
              description="Stock is automatically created when purchases are recorded."
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3">Product Name & SKU</th>
                    <th scope="col" className="px-4 py-3 text-center">Total Available</th>
                    <th scope="col" className="px-4 py-3">Units per Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">SKU: {p.sku}</div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                            p.stock.total <= 3
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {p.stock.total} units
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {p.stock.by_location.map((loc, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold capitalize"
                            >
                              {loc.location.label}: <strong>{loc.qty}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Movements List */}
      {activeTab === 'movements' && (
        <div className="space-y-3">
          {/* Movement Filters */}
          <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-wrap gap-3">
            <select
              value={movementProductFilter || ''}
              onChange={(e) =>
                setMovementProductFilter(e.target.value ? Number(e.target.value) : undefined)
              }
              className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>

            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
            >
              <option value="">All Movement Types</option>
              <option value="purchase">Purchase</option>
              <option value="order_placed">Order Placed</option>
              <option value="order_cancelled">Order Cancelled</option>
              <option value="order_returned">Order Returned</option>
              <option value="correction">Correction</option>
              <option value="damage">Damage</option>
              <option value="transfer">Transfer</option>
              <option value="handover">Handover</option>
            </select>

            {isByLocationMode && (
              <select
                value={movementLocationFilter}
                onChange={(e) => setMovementLocationFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
              >
                <option value="">All Locations</option>
                <option value="gloma">Gloma</option>
                <option value="shop">Shop</option>
              </select>
            )}
          </div>

          {/* Movements Table */}
          {isMovementsLoading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" className="text-indigo-600" />
            </div>
          ) : movements.length === 0 ? (
            <EmptyState
              title="No movements found"
              description="Inventory movements are logged whenever purchases, sales, or adjustments happen."
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Product</th>
                    <th scope="col" className="px-4 py-3">Type</th>
                    <th scope="col" className="px-4 py-3 text-center">Location</th>
                    <th scope="col" className="px-4 py-3 text-right">Quantity (±)</th>
                    <th scope="col" className="px-4 py-3">Reason / Details</th>
                    <th scope="col" className="px-4 py-3 text-right">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {movements.map((m) => {
                    const isPositive = m.qty > 0
                    const isNegative = m.qty < 0

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDateTime(m.created_at)}
                        </td>

                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {m.product ? (
                            <div>
                              <span>{m.product.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono block">
                                SKU: {m.product.sku}
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Badge tone="neutral" size="sm">
                            {m.type.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-center capitalize font-medium text-gray-700">
                          {m.location.label}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-600'
                                : isNegative
                                ? 'text-rose-600'
                                : 'text-gray-700'
                            }
                          >
                            {isPositive ? `+${m.qty}` : m.qty}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                          {m.reason || '—'}
                        </td>

                        <td className="px-4 py-3 text-right text-gray-500 text-[11px]">
                          {m.user?.name || 'System'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      {isAdjustOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsAdjustOpen(false)}
          title="Adjust Stock"
          description="Record a physical count correction, damaged units write-off, or contract end handover."
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <Select
              label="Product"
              value={adjustProductId}
              onChange={(e) => setAdjustProductId(Number(e.target.value))}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) &bull; Total: {p.stock.total}
                </option>
              ))}
            </Select>

            <Select
              label="Adjustment Type"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as any)}
              required
            >
              <option value="correction">Correction (Count variance ±)</option>
              <option value="damage">Damage (Write-off damaged units)</option>
              <option value="handover">Handover (End of contract stock return)</option>
            </Select>

            <Input
              label={
                adjustType === 'correction'
                  ? 'Adjustment Quantity (Positive + or Negative -)'
                  : 'Units to Deduct (Positive Integer)'
              }
              placeholder="e.g. 5 or -2"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              required
            />

            {isByLocationMode && (
              <Select
                label="Location"
                value={adjustLocation}
                onChange={(e) => setAdjustLocation(e.target.value)}
                required
              >
                <option value="gloma">Gloma Warehouse</option>
                <option value="shop">Shop Outlet</option>
              </Select>
            )}

            <Input
              label="Adjustment Reason"
              placeholder="e.g. Audit variance, water damage"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdjustOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Adjustment
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Stock Transfer Dialog */}
      {isTransferOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsTransferOpen(false)}
          title="Transfer Stock Between Locations"
          description="Move physical inventory between Gloma and the shop outlet."
        >
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <Select
              label="Product"
              value={transferProductId}
              onChange={(e) => setTransferProductId(Number(e.target.value))}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) &bull; Total: {p.stock.total}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Transfer From"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value as any)}
                required
              >
                <option value="gloma">Gloma Warehouse</option>
                <option value="shop">Shop Outlet</option>
              </Select>

              <Select
                label="Transfer To"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value as any)}
                required
              >
                <option value="shop">Shop Outlet</option>
                <option value="gloma">Gloma Warehouse</option>
              </Select>
            </div>

            <Input
              label="Transfer Quantity"
              type="number"
              min="1"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              required
            />

            <Input
              label="Reason (Optional)"
              placeholder="e.g. Outlet replenishment"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTransferOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Complete Transfer
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Switch Stock Mode Dialog */}
      {isModeOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsModeOpen(false)}
          title="Switch Stock Mode"
          description="Switch between shared single pool and by-location stock tracking."
          maxWidth="lg"
        >
          <form onSubmit={handleModeSubmit} className="space-y-4">
            <Select
              label="New Stock Mode"
              value={targetStockMode}
              onChange={(e) => setTargetStockMode(e.target.value as any)}
              required
            >
              <option value="single">Single (Shared stock pool)</option>
              <option value="by_location">By Location (Gloma vs Shop)</option>
            </Select>

            {targetStockMode === 'by_location' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 font-semibold border-b border-gray-100 pb-1">
                  <span>Product</span>
                  <span>Gloma / Shop Split (Must equal Total)</span>
                </div>

                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto space-y-2 pr-1">
                  {products.map((p) => {
                    const split = splitMap[p.id] || { gloma: p.stock.total, shop: 0 }
                    const currentSum = split.gloma + split.shop
                    const isBalanced = currentSum === p.stock.total

                    return (
                      <div key={p.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900 block">{p.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Total: {p.stock.total} units
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <input
                              type="number"
                              min="0"
                              value={split.gloma}
                              onChange={(e) =>
                                setSplitMap((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    gloma: Number(e.target.value),
                                    shop: prev[p.id]?.shop || 0,
                                  },
                                }))
                              }
                              className="w-full rounded border border-gray-300 p-1 text-center font-bold"
                              title="Gloma units"
                            />
                            <span className="text-[9px] text-gray-400 block text-center mt-0.5">Gloma</span>
                          </div>

                          <div className="w-16">
                            <input
                              type="number"
                              min="0"
                              value={split.shop}
                              onChange={(e) =>
                                setSplitMap((prev) => ({
                                  ...prev,
                                  [p.id]: {
                                    gloma: prev[p.id]?.gloma || 0,
                                    shop: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-full rounded border border-gray-300 p-1 text-center font-bold"
                              title="Shop units"
                            />
                            <span className="text-[9px] text-gray-400 block text-center mt-0.5">Shop</span>
                          </div>

                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                              isBalanced
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {currentSum} / {p.stock.total}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Confirm Mode Change
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
