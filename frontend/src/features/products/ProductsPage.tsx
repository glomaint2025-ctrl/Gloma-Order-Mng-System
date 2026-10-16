import { useState } from 'react'
import { ProductThumb, ProductImageField } from './ProductImage'
import { apiError } from '@/lib/apiError'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProducts, createProduct, updateProduct } from '@/api/products'
import { useAuth } from '@/app/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { hasPermission } from '@/lib/permissions'
import { Plus, Search, Edit2 } from 'lucide-react'
import type { Product } from '@/api/types'

export function ProductsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const { me } = useAuth()
  const canManageProducts = hasPermission('products.manage', me)

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)

  // Dialog state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isActive, setIsActive] = useState(true)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', parsedShopId, { search, activeFilter, page }],
    queryFn: () =>
      getProducts(parsedShopId, {
        search: search || undefined,
        active: activeFilter,
        page,
        per_page: 25,
      }),
    enabled: parsedShopId > 0,
  })

  const products = data?.data || []

  const openCreateDialog = () => {
    setEditingProduct(null)
    setSku('')
    setName('')
    setDescription('')
    setPrice('')
    setIsActive(true)
    setIsDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setSku(product.sku)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price)
    setIsActive(product.is_active)
    setIsDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sku.trim() || !name.trim() || !price.trim()) {
      toast.show('SKU, Name, and Price are required.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingProduct) {
        await updateProduct(parsedShopId, editingProduct.id, {
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || null,
          price: price.trim(),
          is_active: isActive,
        })
        toast.show('Product updated successfully.', 'success')
      } else {
        await createProduct(parsedShopId, {
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || null,
          price: price.trim(),
        })
        toast.show('Product created successfully.', 'success')
      }
      setIsDialogOpen(false)
      refetch()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to save product.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Products</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View stock availability, selling prices, and inventory
          </p>
        </div>

        {canManageProducts && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateDialog}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Product
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by SKU or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <select
          value={activeFilter === undefined ? '' : String(activeFilter)}
          onChange={(e) => {
            const val = e.target.value
            setActiveFilter(val === '' ? undefined : Number(val))
            setPage(1)
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="1">Active Only</option>
          <option value="0">Inactive Only</option>
        </select>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your search or add a new product."
          action={
            canManageProducts ? (
              <Button variant="primary" size="sm" onClick={openCreateDialog}>
                Add First Product
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3 text-right">Selling Price</th>
                <th scope="col" className="px-4 py-3 text-right">Avg Cost</th>
                <th scope="col" className="px-4 py-3 text-center">Total Stock</th>
                <th scope="col" className="px-4 py-3">Stock by Location</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                {canManageProducts && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} />
                      <div className="min-w-0">
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">SKU: {product.sku}</div>
                        {product.description && (
                          <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                    <MoneyDisplay amount={product.price} />
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    <MoneyDisplay amount={product.avg_cost} />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full font-bold text-xs ${
                        product.stock.total <= 3
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {product.stock.total}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {product.stock.by_location.map((loc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium capitalize"
                        >
                          {loc.location.label}: <strong>{loc.qty}</strong>
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge tone={product.is_active ? 'success' : 'neutral'} size="sm">
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  {canManageProducts && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Create/Edit Dialog */}
      {isDialogOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsDialogOpen(false)}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          description="Products represent items invested by Gloma and stocked in the shop."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="SKU / Barcode"
              placeholder="e.g. TSHIRT-BLK-M"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Product Name"
              placeholder="e.g. Cotton Crewneck T-Shirt"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Description (Optional)"
              placeholder="Color, size, or material details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Input
              label="Retail Selling Price (LKR)"
              placeholder="2500.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />

            {editingProduct ? (
              <ProductImageField
                shopId={parsedShopId}
                product={editingProduct}
                onChange={(updated) => {
                  setEditingProduct(updated)
                  refetch()
                }}
              />
            ) : (
              <p className="text-[11px] text-gray-500">You can add a photo after the product is created.</p>
            )}

            {editingProduct && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active product (available for new orders)</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
