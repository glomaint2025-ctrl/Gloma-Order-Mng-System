import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAdminShops, setAdminShopStatus } from '@/api/admin'
import { useAuth } from '@/app/authContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/toast'
import { Plus, Search, Edit2, Users, ExternalLink } from 'lucide-react'
import type { Shop } from '@/api/types'

export function ShopsAdminPage() {
  const navigate = useNavigate()
  const { setCurrentShopId, refreshMe } = useAuth()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Status Change Dialog
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended' | 'closed' | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-shops', { search, statusFilter, page }],
    queryFn: () =>
      getAdminShops({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
      }),
  })

  const shops = data?.data || []

  const handleOpenStatusConfirm = (shop: Shop, status: 'active' | 'suspended' | 'closed') => {
    setSelectedShop(shop)
    setTargetStatus(status)
  }

  const handleConfirmStatus = async () => {
    if (!selectedShop || !targetStatus) return
    setIsUpdatingStatus(true)
    try {
      await setAdminShopStatus(selectedShop.id, targetStatus)
      toast.show(`Shop ${selectedShop.name} status updated to ${targetStatus}.`, 'success')
      setSelectedShop(null)
      setTargetStatus(null)
      await refreshMe()
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to update shop status.', 'danger')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleOpenShop = (shopId: number) => {
    setCurrentShopId(shopId)
    navigate(`/shops/${shopId}/dashboard`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Partner Shops</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage partner onboarding, contract status, and shop owners
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/shops/new')}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Create New Shop
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by shop name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Shops List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : shops.length === 0 ? (
        <EmptyState
          title="No shops found"
          description="Create your first partner shop to begin managing inventory and sales."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/shops/new')}
            >
              Create Shop
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{shop.name}</span>
                    <Badge tone={shop.status.tone || 'neutral'} size="sm">
                      {shop.status.label}
                    </Badge>
                    <span className="text-xs text-gray-500 font-mono">Code: {shop.code}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>Mode: <strong className="font-semibold text-gray-700">{shop.stock_mode.label}</strong></span>
                    {shop.contract_ref && (
                      <>
                        <span>&bull;</span>
                        <span>Ref: {shop.contract_ref}</span>
                      </>
                    )}
                    {shop.owners && shop.owners.length > 0 && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          Owners: {shop.owners.map((o) => o.name).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenShop(shop.id)}
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Open Shop
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/shops/${shop.id}`)}
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit & Owners
                  </Button>

                  {shop.status.value === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenStatusConfirm(shop, 'suspended')}
                      className="text-amber-700 hover:bg-amber-50"
                    >
                      Suspend
                    </Button>
                  )}

                  {shop.status.value === 'suspended' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenStatusConfirm(shop, 'active')}
                      className="text-emerald-700 hover:bg-emerald-50"
                    >
                      Reactivate
                    </Button>
                  )}

                  {shop.status.value !== 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenStatusConfirm(shop, 'closed')}
                      className="text-rose-700 hover:bg-rose-50"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Status Change Dialog */}
      {selectedShop && targetStatus && (
        <Dialog
          isOpen={true}
          onClose={() => {
            setSelectedShop(null)
            setTargetStatus(null)
          }}
          title={`Confirm ${targetStatus === 'closed' ? 'Closing' : targetStatus === 'suspended' ? 'Suspension of' : 'Reactivating'} Shop`}
          description={`Are you sure you want to change ${selectedShop.name} status to "${targetStatus}"?`}
        >
          <div className="space-y-4">
            {targetStatus === 'closed' && (
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                Warning: Closing a shop marks the end of its contract. Shop owners will only have read-only access.
              </p>
            )}

            {targetStatus === 'suspended' && (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Shop owners will be locked out with a "Shop suspended" message until reactivated.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedShop(null)
                  setTargetStatus(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant={targetStatus === 'active' ? 'primary' : 'danger'}
                size="sm"
                isLoading={isUpdatingStatus}
                onClick={handleConfirmStatus}
              >
                Yes, Change Status
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
