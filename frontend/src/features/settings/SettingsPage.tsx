import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  getCourierAccounts,
  createCourierAccount,
  updateCourierAccount,
  getTemplates,
  saveTemplate,
  resetTemplate,
} from '@/api/settings'
import { getMessages } from '@/api/finance'
import { getMeta } from '@/api/meta'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { formatDateTime, getCurrentMonth } from '@/lib/date'
import { calculateSmsSegments } from '@/lib/sms'
import {
  CreditCard,
  Truck,
  MessageSquare,
  FileText,
  Plus,
  Edit2,
  RotateCcw,
} from 'lucide-react'
import type { CourierAccount, PaymentMethod, TemplateRow } from '@/api/types'

export function SettingsPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)

  const [activeTab, setActiveTab] = useState<'payments' | 'couriers' | 'templates' | 'sms-log'>('payments')

  // Payment Method Dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null)
  const [paymentName, setPaymentName] = useState('')
  const [paymentKind, setPaymentKind] = useState<'cod' | 'prepaid'>('prepaid')
  const [paymentRequiresSlip, setPaymentRequiresSlip] = useState(false)
  const [paymentIsActive, setPaymentIsActive] = useState(true)

  // Courier Account Dialog
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false)
  const [editingCourier, setEditingCourier] = useState<CourierAccount | null>(null)
  const [courierId, setCourierId] = useState<number>(0)
  const [courierLabel, setCourierLabel] = useState('')
  const [courierRef, setCourierRef] = useState('')
  const [courierCharge, setCourierCharge] = useState('')
  const [courierIsActive, setCourierIsActive] = useState(true)

  // Template Edit Dialog
  const [editingTemplateRow, setEditingTemplateRow] = useState<TemplateRow | null>(null)
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')

  // SMS Log Month
  const [smsMonth, setSmsMonth] = useState(() => getCurrentMonth())

  // Queries
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: getMeta })

  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ['payment-methods-all', parsedShopId],
    queryFn: () => getPaymentMethods(parsedShopId),
    enabled: activeTab === 'payments' && parsedShopId > 0,
  })

  const { data: couriers, refetch: refetchCouriers } = useQuery({
    queryKey: ['courier-accounts-all', parsedShopId],
    queryFn: () => getCourierAccounts(parsedShopId),
    enabled: activeTab === 'couriers' && parsedShopId > 0,
  })

  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ['templates', parsedShopId],
    queryFn: () => getTemplates(parsedShopId),
    enabled: activeTab === 'templates' && parsedShopId > 0,
  })

  const { data: messagesData, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', parsedShopId, smsMonth],
    queryFn: () => getMessages(parsedShopId, { month: smsMonth }),
    enabled: activeTab === 'sms-log' && parsedShopId > 0,
  })

  // Payment Submit
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentName.trim()) return

    try {
      if (editingPayment) {
        await updatePaymentMethod(parsedShopId, editingPayment.id, {
          name: paymentName.trim(),
          kind: paymentKind,
          requires_slip: paymentRequiresSlip,
          is_active: paymentIsActive,
        })
        toast.show('Payment method updated.', 'success')
      } else {
        await createPaymentMethod(parsedShopId, {
          name: paymentName.trim(),
          kind: paymentKind,
          requires_slip: paymentRequiresSlip,
        })
        toast.show('Payment method created.', 'success')
      }
      setIsPaymentDialogOpen(false)
      refetchPayments()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to save payment method.', 'danger')
    }
  }

  // Courier Submit
  const handleSaveCourier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courierLabel.trim() || !courierId) return

    try {
      if (editingCourier) {
        await updateCourierAccount(parsedShopId, editingCourier.id, {
          courier_id: courierId,
          label: courierLabel.trim(),
          account_ref: courierRef.trim() || null,
          default_charge: courierCharge.trim() || null,
          is_active: courierIsActive,
        })
        toast.show('Courier account updated.', 'success')
      } else {
        await createCourierAccount(parsedShopId, {
          courier_id: courierId,
          label: courierLabel.trim(),
          account_ref: courierRef.trim() || null,
          default_charge: courierCharge.trim() || null,
        })
        toast.show('Courier account added.', 'success')
      }
      setIsCourierDialogOpen(false)
      refetchCouriers()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to save courier account.', 'danger')
    }
  }

  // Template Submit
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplateRow || !templateBody.trim()) return

    try {
      await saveTemplate(parsedShopId, {
        event: editingTemplateRow.event.value,
        channel: editingTemplateRow.channel.value,
        subject: templateSubject.trim() || null,
        body: templateBody.trim(),
      })
      toast.show('Template override saved for this shop.', 'success')
      setEditingTemplateRow(null)
      refetchTemplates()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to save template.', 'danger')
    }
  }

  const handleResetTemplate = async (row: TemplateRow) => {
    try {
      await resetTemplate(parsedShopId, {
        event: row.event.value,
        channel: row.channel.value,
      })
      toast.show('Template reset to default.', 'info')
      refetchTemplates()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to reset template.', 'danger')
    }
  }

  const smsCalc = calculateSmsSegments(templateBody)

  return (
    <div className="space-y-5">
      <div className="pb-2 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Shop Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure payment options, dispatch accounts, customer notification templates, and view SMS billing
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Payment Methods
        </button>

        <button
          onClick={() => setActiveTab('couriers')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'couriers'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Courier Accounts
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Message Templates
        </button>

        <button
          onClick={() => setActiveTab('sms-log')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'sms-log'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          SMS Log & Billing
        </button>
      </div>

      {/* Tab 1: Payment Methods */}
      {activeTab === 'payments' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Payment methods available when placing and confirming orders
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingPayment(null)
                setPaymentName('')
                setPaymentKind('prepaid')
                setPaymentRequiresSlip(false)
                setPaymentIsActive(true)
                setIsPaymentDialogOpen(true)
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Payment Method
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="divide-y divide-gray-100">
              {payments?.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{m.name}</span>
                      <Badge tone={m.kind.value === 'cod' ? 'info' : 'primary'} size="sm">
                        {m.kind.label}
                      </Badge>
                      {m.requires_slip && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Slip Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge tone={m.is_active ? 'success' : 'neutral'} size="sm">
                      {m.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPayment(m)
                        setPaymentName(m.name)
                        setPaymentKind(m.kind.value as 'cod' | 'prepaid')
                        setPaymentRequiresSlip(m.requires_slip)
                        setPaymentIsActive(m.is_active)
                        setIsPaymentDialogOpen(true)
                      }}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Courier Accounts */}
      {activeTab === 'couriers' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Your shop's own accounts with courier companies for parcel delivery
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingCourier(null)
                setCourierId(meta?.couriers[0]?.id || 0)
                setCourierLabel('')
                setCourierRef('')
                setCourierCharge('')
                setCourierIsActive(true)
                setIsCourierDialogOpen(true)
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Courier Account
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="divide-y divide-gray-100">
              {couriers?.map((acc) => (
                <div key={acc.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {acc.courier.name} — {acc.label}
                      </span>
                      {acc.account_ref && (
                        <span className="text-gray-400 font-mono text-[11px]">
                          ({acc.account_ref})
                        </span>
                      )}
                    </div>
                    {acc.default_charge && (
                      <span className="text-gray-500 text-[11px] mt-0.5 block">
                        Default Charge: <MoneyDisplay amount={acc.default_charge} />
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
                      onClick={() => {
                        setEditingCourier(acc)
                        setCourierId(acc.courier.id)
                        setCourierLabel(acc.label)
                        setCourierRef(acc.account_ref || '')
                        setCourierCharge(acc.default_charge || '')
                        setCourierIsActive(acc.is_active)
                        setIsCourierDialogOpen(true)
                      }}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Message Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Customize SMS and email notifications sent to customers on order events.
          </p>

          <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs divide-y divide-gray-100 overflow-hidden">
            {templatesData?.data.map((row, idx) => {
              const currentTpl = row.shop_template || row.global_template
              const isShopOverride = row.uses === 'shop'

              return (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {row.event.label}
                      </span>
                      <Badge tone={row.channel.value === 'sms' ? 'primary' : 'info'} size="sm">
                        {row.channel.label}
                      </Badge>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isShopOverride
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isShopOverride ? 'Customized for Shop' : 'Using Global Default'}
                      </span>
                    </div>

                    <p className="text-gray-600 line-clamp-2 text-xs italic">
                      "{currentTpl?.body}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isShopOverride && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetTemplate(row)}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Reset to Default
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingTemplateRow(row)
                        setTemplateSubject(currentTpl?.subject || '')
                        setTemplateBody(currentTpl?.body || '')
                      }}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      {isShopOverride ? 'Edit' : 'Customize'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 4: SMS Log & Billing */}
      {activeTab === 'sms-log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-gray-700">Billing Month:</span>
            <input
              type="month"
              value={smsMonth}
              onChange={(e) => setSmsMonth(e.target.value)}
              className="px-3 py-1 text-xs border border-gray-300 rounded-lg text-gray-800"
            />
          </div>

          {messagesData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-center">
                <span className="text-[11px] text-gray-500 font-medium block">Messages Sent</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">
                  {messagesData.summary.sms_sent}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-center">
                <span className="text-[11px] text-gray-500 font-medium block">Total Segments</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">
                  {messagesData.summary.sms_segments}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-center">
                <span className="text-[11px] text-gray-500 font-medium block">Failed Deliveries</span>
                <span className="text-xl font-bold text-rose-600 mt-1 block">
                  {messagesData.summary.failed}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs text-center">
                <span className="text-[11px] text-indigo-700 font-semibold block">Total SMS Cost</span>
                <span className="text-xl font-bold text-indigo-800 mt-1 block">
                  <MoneyDisplay amount={messagesData.summary.sms_cost} />
                </span>
              </div>
            </div>
          )}

          {isMessagesLoading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">Date</th>
                    <th scope="col" className="px-3 py-2.5">Recipient</th>
                    <th scope="col" className="px-3 py-2.5">Channel</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Segments</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Cost</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {messagesData?.data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-800">{log.recipient}</td>
                      <td className="px-3 py-2.5 uppercase font-medium text-gray-600">
                        {log.channel.label}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-700">
                        {log.segments}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900">
                        <MoneyDisplay amount={log.cost} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge
                          tone={
                            log.status === 'sent'
                              ? 'success'
                              : log.status === 'failed'
                              ? 'danger'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Method Dialog */}
      {isPaymentDialogOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsPaymentDialogOpen(false)}
          title={editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}
          description="Payment option usable during order checkout."
        >
          <form onSubmit={handleSavePayment} className="space-y-4">
            <Input
              label="Method Name"
              placeholder="e.g. Bank Transfer (Commercial Bank)"
              value={paymentName}
              onChange={(e) => setPaymentName(e.target.value)}
              required
              autoFocus
            />

            <Select
              label="Type"
              value={paymentKind}
              onChange={(e) => setPaymentKind(e.target.value as 'cod' | 'prepaid')}
              required
            >
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="prepaid">Prepaid (Bank Wire / Online)</option>
            </Select>

            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentRequiresSlip}
                  onChange={(e) => setPaymentRequiresSlip(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span>Requires payment slip attachment</span>
              </label>

              {editingPayment && (
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentIsActive}
                    onChange={(e) => setPaymentIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span>Active (available on order form)</span>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Method
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Courier Account Dialog */}
      {isCourierDialogOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsCourierDialogOpen(false)}
          title={editingCourier ? 'Edit Courier Account' : 'Add Courier Account'}
          description="Your shop's account details with the courier partner."
        >
          <form onSubmit={handleSaveCourier} className="space-y-4">
            <Select
              label="Courier Service"
              value={courierId}
              onChange={(e) => setCourierId(Number(e.target.value))}
              required
            >
              {meta?.couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>

            <Input
              label="Account Label"
              placeholder="e.g. Colombo Express Main"
              value={courierLabel}
              onChange={(e) => setCourierLabel(e.target.value)}
              required
            />

            <Input
              label="Account Reference / Client ID (Optional)"
              placeholder="e.g. AC-99812"
              value={courierRef}
              onChange={(e) => setCourierRef(e.target.value)}
            />

            <Input
              label="Default Delivery Charge (LKR)"
              placeholder="350.00"
              value={courierCharge}
              onChange={(e) => setCourierCharge(e.target.value)}
            />

            {editingCourier && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={courierIsActive}
                  onChange={(e) => setCourierIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span>Active account</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCourierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Courier Account
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Template Editor Dialog */}
      {editingTemplateRow && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingTemplateRow(null)}
          title={`Edit ${editingTemplateRow.channel.label} Template`}
          description={`Event: ${editingTemplateRow.event.label}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            {editingTemplateRow.channel.value === 'email' && (
              <Input
                label="Email Subject"
                placeholder="e.g. Your order is on the way!"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                required
              />
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Message Body
              </label>
              <textarea
                rows={5}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                required
              />
            </div>

            {/* Live SMS Counter */}
            {editingTemplateRow.channel.value === 'sms' && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-800">
                    {smsCalc.segments} SMS {smsCalc.segments === 1 ? 'segment' : 'segments'}
                  </span>
                  <span className="text-gray-500 block text-[11px] mt-0.5">
                    {smsCalc.characterCount} characters ({smsCalc.remainingInSegment} left in current part)
                  </span>
                </div>
                <Badge tone={smsCalc.isUnicode ? 'warning' : 'neutral'} size="sm">
                  {smsCalc.isUnicode ? 'Unicode (Sinhala/Tamil/Emoji)' : 'GSM-7 (Standard)'}
                </Badge>
              </div>
            )}

            {/* Placeholders Helper */}
            {templatesData?.placeholders && (
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Available Placeholders (click to insert):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {templatesData.placeholders.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setTemplateBody((prev) => `${prev} ${ph}`)}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTemplateRow(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Template
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
