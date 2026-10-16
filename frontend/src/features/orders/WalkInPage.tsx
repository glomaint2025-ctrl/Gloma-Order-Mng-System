import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { createOrder } from '@/api/orders'
import { getProducts } from '@/api/products'
import { getPaymentMethods } from '@/api/settings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { toast } from '@/lib/toast'
import { toCents, fromCents } from '@/lib/money'
import { Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import type { OrderInput } from '@/api/types'

interface FormItem {
  product_id: number
  qty: number
  unit_price: string
}

interface WalkInFormValues {
  payment_method_id: number
  customer_name: string
  customer_phone: string
  items: FormItem[]
  discount: string
}

export function WalkInPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products-active', parsedShopId],
    queryFn: () => getProducts(parsedShopId, { active: 1, per_page: 100 }),
    enabled: parsedShopId > 0,
  })

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', parsedShopId],
    queryFn: () => getPaymentMethods(parsedShopId, { active_only: 1 }),
    enabled: parsedShopId > 0,
  })

  const { register, control, handleSubmit, watch, setValue } = useForm<WalkInFormValues>({
    defaultValues: {
      payment_method_id: 0,
      customer_name: '',
      customer_phone: '',
      items: [{ product_id: 0, qty: 1, unit_price: '0.00' }],
      discount: '0.00',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = watch('items')
  const watchedDiscount = watch('discount')
  const watchedPaymentMethodId = watch('payment_method_id')

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !watchedPaymentMethodId) {
      setValue('payment_method_id', paymentMethods[0].id)
    }
  }, [paymentMethods, watchedPaymentMethodId, setValue])

  const totals = useMemo(() => {
    let subtotalCents = 0
    watchedItems.forEach((item) => {
      const priceCents = toCents(item.unit_price || '0')
      subtotalCents += priceCents * (item.qty || 1)
    })
    const discCents = toCents(watchedDiscount || '0')
    const totalCents = Math.max(0, subtotalCents - discCents)
    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(discCents),
      total: fromCents(totalCents),
    }
  }, [watchedItems, watchedDiscount])

  const handleProductChange = (index: number, productId: number) => {
    const product = productsData?.data.find((p) => p.id === productId)
    if (product) {
      setValue(`items.${index}.product_id`, productId)
      setValue(`items.${index}.unit_price`, product.price)
    }
  }

  const onSubmit = async (values: WalkInFormValues) => {
    setStockError(null)
    setIsSubmitting(true)

    const payload: OrderInput = {
      channel: 'walk_in',
      payment_method_id: values.payment_method_id,
      customer: values.customer_name || values.customer_phone ? {
        name: values.customer_name || 'Walk-in Customer',
        phone: values.customer_phone || '',
      } : null,
      items: values.items.map((i) => ({
        product_id: Number(i.product_id),
        qty: Number(i.qty),
        unit_price: i.unit_price,
      })),
      delivery_fee: '0.00',
      discount: values.discount || '0.00',
    }

    try {
      const order = await createOrder(parsedShopId, payload)
      toast.show(`Walk-in sale ${order.number} completed!`, 'success')
      navigate(`/shops/${parsedShopId}/orders/${order.id}`)
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.code === 'insufficient_stock') {
        setStockError(err.response?.data?.message || 'Insufficient stock for this sale.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Walk-in Counter Sale</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Quick point of sale. Automatically marked as Completed and Paid.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Items Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Items Sold</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ product_id: 0, qty: 1, unit_price: '0.00' })}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Item
            </Button>
          </div>

          {stockError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{stockError}</span>
            </div>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
              >
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product</label>
                  <select
                    aria-label={`Product ${index + 1}`}
                    className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    value={watchedItems[index]?.product_id || ''}
                    onChange={(e) => handleProductChange(index, Number(e.target.value))}
                  >
                    <option value="">Select product...</option>
                    {productsData?.data.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) &bull; Stock: {p.stock.total}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-20">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    aria-label={`Quantity for item ${index + 1}`}
                    {...register(`items.${index}.qty`, { valueAsNumber: true })}
                  />
                </div>

                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Price</label>
                  <input
                    type="text"
                    className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    aria-label={`Unit price for item ${index + 1}`}
                    {...register(`items.${index}.unit_price`)}
                  />
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Customer Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Payment & Optional Customer
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              required
              {...register('payment_method_id', { valueAsNumber: true })}
            >
              {paymentMethods?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.kind.label})
                </option>
              ))}
            </Select>

            <Input label="Discount (LKR)" placeholder="0.00" {...register('discount')} />

            <Input
              label="Customer Name (Optional)"
              placeholder="e.g. Kasun"
              {...register('customer_name')}
            />

            <Input
              label="Customer Phone (Optional)"
              placeholder="0771234567"
              {...register('customer_phone')}
            />
          </div>
        </div>

        {/* Submit Total Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 block">Total Amount</span>
            <MoneyDisplay amount={totals.total} className="text-2xl font-bold text-indigo-700" />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="w-5 h-5" />}
          >
            Complete Sale
          </Button>
        </div>
      </form>
    </div>
  )
}
