import { useState } from 'react'
import { CustomerPrivacyCard } from './CustomerPrivacyCard'
import { useAuth } from '@/app/useAuth'
import { hasPermission } from '@/lib/permissions'
import { apiError } from '@/lib/apiError'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCustomer, updateCustomer } from '@/api/customers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { WarningBanner } from '@/components/ui/WarningBanner'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { formatDate } from '@/lib/date'
import { ArrowLeft, Phone, Mail, MapPin, ShieldAlert, Save } from 'lucide-react'

export function CustomerDetailPage() {
  const { shopId, customerId } = useParams<{ shopId: string; customerId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const parsedCustomerId = parseInt(customerId || '0', 10)
  const navigate = useNavigate()
  const { me } = useAuth()
  const canManagePrivacy = hasPermission('privacy.manage', me)

  const [isRisky, setIsRisky] = useState(false)
  const [riskNote, setRiskNote] = useState('')
  const [isSavingRisk, setIsSavingRisk] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer', parsedShopId, parsedCustomerId],
    queryFn: async () => {
      const res = await getCustomer(parsedShopId, parsedCustomerId)
      setIsRisky(res.customer.is_risky)
      setRiskNote(res.customer.risk_note || '')
      return res
    },
    enabled: parsedShopId > 0 && parsedCustomerId > 0,
  })

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    )
  }

  if (!data) return null

  const { customer, recent_orders } = data

  const handleSaveRisk = async () => {
    setIsSavingRisk(true)
    try {
      await updateCustomer(parsedShopId, customer.id, {
        is_risky: isRisky,
        risk_note: riskNote.trim() || null,
      })
      toast.show('Customer risk status updated.', 'success')
      refetch()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to update customer.', 'danger')
    } finally {
      setIsSavingRisk(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate(`/shops/${parsedShopId}/customers`)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
            {customer.is_risky && (
              <Badge tone="danger" size="sm">
                Flagged as Risky
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {customer.phone_local || customer.phone}
          </span>
        </div>
      </div>

      {/* Warnings Banner */}
      {customer.warnings && customer.warnings.length > 0 && (
        <WarningBanner warnings={customer.warnings} />
      )}

      {/* Contact Details & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Contact & Location
          </h2>

          <div className="space-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <a href={`tel:${customer.phone}`} className="font-semibold text-indigo-600 hover:underline">
                {customer.phone_local || customer.phone}
              </a>
            </div>

            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <a href={`mailto:${customer.email}`} className="hover:underline">
                  {customer.email}
                </a>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Customer Ordering Stats
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 font-medium block">Total Orders</span>
              <span className="text-xl font-bold text-gray-900 mt-1 block">
                {customer.orders_count}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100 text-center">
              <span className="text-[11px] text-rose-700 font-medium block">Returns Count</span>
              <span className="text-xl font-bold text-rose-700 mt-1 block">
                {customer.returns_count}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Flagging Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Delivery Risk Status</h2>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isRisky}
              onChange={(e) => setIsRisky(e.target.checked)}
              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <span>Flag as High-Risk Customer</span>
          </label>
        </div>

        <Input
          label="Risk Note / Warning Details"
          placeholder="e.g. Previous returned COD parcels without answering phone"
          value={riskNote}
          onChange={(e) => setRiskNote(e.target.value)}
          helperText="This note displays as a warning banner whenever entering new orders for this customer."
        />

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveRisk}
            isLoading={isSavingRisk}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Save Risk Status
          </Button>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Recent Orders ({recent_orders.length})
          </h2>
        </div>

        {recent_orders.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No orders placed yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent_orders.map((o) => (
              <div
                key={o.id}
                onClick={() => navigate(`/shops/${parsedShopId}/orders/${o.id}`)}
                className="p-3.5 flex items-center justify-between hover:bg-gray-50/70 cursor-pointer text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">{o.number}</span>
                    <Badge tone={o.status.tone || 'neutral'} size="sm">
                      {o.status.label}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-gray-400">{formatDate(o.created_at)}</span>
                </div>

                <div className="text-right">
                  <MoneyDisplay amount={o.total} className="font-bold text-gray-900" />
                  <span className="text-[11px] text-gray-500 block">{o.items_count} items</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManagePrivacy && (
        <CustomerPrivacyCard shopId={parsedShopId} customerId={customer.id} customerName={customer.name} />
      )}
    </div>
  )
}
