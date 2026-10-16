import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/authContext'
import { Badge } from '@/components/ui/Badge'
import { Store, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react'
import type { ShopSummary } from '@/api/types'

export function ShopPickerPage() {
  const { me, setCurrentShopId } = useAuth()
  const navigate = useNavigate()

  const shops = me?.shops || []

  const handleSelect = (shop: ShopSummary) => {
    if (!shop.can_open) return
    setCurrentShopId(shop.id)
    navigate(`/shops/${shop.id}/dashboard`)
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Select a Shop</h1>
          <p className="text-xs text-gray-500 mt-1">
            You have access to multiple shops. Choose one to open the management portal.
          </p>
        </div>
        {me?.is_admin && (
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go to Admin
          </button>
        )}
      </div>

      <div className="space-y-3">
        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            disabled={!shop.can_open}
            onClick={() => handleSelect(shop)}
            className={`w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200/80 shadow-2xs transition-all text-left ${
              shop.can_open
                ? 'hover:border-indigo-300 hover:shadow-xs cursor-pointer'
                : 'opacity-55 cursor-not-allowed bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{shop.name}</span>
                  <Badge tone={shop.status.tone || 'neutral'} size="sm">
                    {shop.status.label}
                  </Badge>
                  {shop.status.value === 'closed' && (
                    <Badge tone="danger" size="sm">
                      Read-only
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 font-mono">Code: {shop.code}</span>
                  <span className="text-xs text-gray-400">&bull;</span>
                  <span className="text-xs text-gray-500">Mode: {shop.stock_mode.label}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!shop.can_open ? (
                <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Suspended
                </span>
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
        ))}

        {shops.length === 0 && (
          <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">No shops assigned to this account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
