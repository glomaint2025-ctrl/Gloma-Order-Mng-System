import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, ChevronDown, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../authContext'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import type { ShopSummary } from '@/api/types'

export function ShopSwitcher() {
  const { me, currentShop, setCurrentShopId } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const shops = me?.shops || []
  const hasMultipleShops = shops.length > 1 || me?.is_admin

  const handleSelectShop = (shop: ShopSummary) => {
    if (!shop.can_open) return
    setCurrentShopId(shop.id)
    setIsOpen(false)
    navigate(`/shops/${shop.id}/dashboard`)
  }

  if (!currentShop && shops.length === 0) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => hasMultipleShops && setIsOpen(true)}
        disabled={!hasMultipleShops}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
          hasMultipleShops
            ? 'border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500'
            : 'border-transparent bg-transparent cursor-default'
        }`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-xs shrink-0">
          <Store className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-900 truncate max-w-[130px] sm:max-w-[200px]">
              {currentShop?.name || 'Select shop'}
            </span>
            {currentShop?.status.value === 'closed' && (
              <Badge tone="danger" size="sm">
                Read-only
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono tracking-wider block">
            {currentShop?.code}
          </span>
        </div>
        {hasMultipleShops && <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />}
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Switch Shop"
        description="Choose a shop to manage and view stock, orders, and sales."
      >
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {shops.map((shop) => {
            const isSelected = shop.id === currentShop?.id
            return (
              <button
                key={shop.id}
                type="button"
                disabled={!shop.can_open}
                onClick={() => handleSelectShop(shop)}
                className={`w-full flex items-center justify-between p-3.5 text-left rounded-lg transition-colors cursor-pointer ${
                  isSelected ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
                } ${!shop.can_open ? 'opacity-50 cursor-not-allowed bg-gray-50/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs">
                    {shop.code.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{shop.name}</span>
                      <Badge tone={shop.status.tone || 'neutral'} size="sm">
                        {shop.status.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">Code: {shop.code}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!shop.can_open && (
                    <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Suspended
                    </span>
                  )}
                  {isSelected && <Check className="w-5 h-5 text-indigo-600" />}
                </div>
              </button>
            )
          })}
        </div>
      </Dialog>
    </>
  )
}
