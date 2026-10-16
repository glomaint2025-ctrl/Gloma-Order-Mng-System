import { useEffect, useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { getOrder, createOrder, updateOrder } from '@/api/orders'
import { getProducts } from '@/api/products'
import { lookupCustomer } from '@/api/customers'
import { getPaymentMethods } from '@/api/settings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { WarningBanner } from '@/components/ui/WarningBanner'
import { MoneyDisplay } from '@/components/ui/MoneyDisplay'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { toCents, fromCents } from '@/lib/money'
import { Plus, Trash2, ArrowLeft, Save, AlertCircle } from 'lucide-react'
import type { OrderInput, OrderWarning } from '@/api/types'

interface FormItem {
  product_id: number
  qty: number
  unit_price: string
}

interface FormValues {
  channel: 'delivery' | 'walk_in'
  payment_method_id: number
  customer_phone: string
  customer_name: string
  customer_email: string
  customer_address: string
  customer_city: string
  items: FormItem[]
  delivery_fee: string
  discount: string
  note: string
}

export function OrderFormPage() {
  const { shopId, orderId } = useParams<{ shopId: string; orderId?: string }>()
  const parsedShopId = parseInt(shopId || '0', 10)
  const isEditing = Boolean(orderId)
  const parsedOrderId = parseInt(orderId || '0', 10)
  const navigate = useNavigate()

  // null until a phone lookup runs; until then an edited order shows its own warnings.
  const [lookupWarnings, setLookupWarnings] = useState<OrderWarning[] | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch products for item selector
  const { data: productsData } = useQuery({
    queryKey: ['products-active', parsedShopId],
    queryFn: () => getProducts(parsedShopId, { active: 1, per_page: 100 }),
    enabled: parsedShopId > 0,
  })

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', parsedShopId],
    queryFn: () => getPaymentMethods(parsedShopId, { active_only: 1 }),
    enabled: parsedShopId > 0,
  })

  // Fetch existing order if in edit mode
  const { data: existingOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', parsedShopId, parsedOrderId],
    queryFn: () => getOrder(parsedShopId, parsedOrderId),
    enabled: isEditing && parsedOrderId > 0,
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      channel: 'delivery',
      payment_method_id: 0,
      customer_phone: '',
      customer_name: '',
      customer_email: '',
      customer_address: '',
      customer_city: '',
      items: [{ product_id: 0, qty: 1, unit_price: '0.00' }],
      delivery_fee: '350.00',
      discount: '0.00',
      note: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = useWatch({ control, name: 'items' })
  const watchedDeliveryFee = useWatch({ control, name: 'delivery_fee' })
  const watchedDiscount = useWatch({ control, name: 'discount' })
  const watchedPhone = useWatch({ control, name: 'customer_phone' })
  const watchedPaymentMethodId = useWatch({ control, name: 'payment_method_id' })

  // Set default payment method when loaded
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !watchedPaymentMethodId) {
      // Default to cash on delivery when the shop has it (most orders are COD).
      setValue('payment_method_id', (paymentMethods.find((m) => m.kind.value === 'cod') ?? paymentMethods[0]).id)
    }
  }, [paymentMethods, watchedPaymentMethodId, setValue])

  // Populate form if editing
  useEffect(() => {
    if (existingOrder) {
      setValue('channel', existingOrder.channel.value as 'delivery' | 'walk_in')
      setValue('payment_method_id', existingOrder.payment_method?.id || 0)
      setValue('customer_phone', existingOrder.customer.phone_local || existingOrder.customer.phone || '')
      setValue('customer_name', existingOrder.customer.name || '')
      setValue('customer_email', existingOrder.customer.email || '')
      setValue('customer_address', existingOrder.customer.address || '')
      setValue('customer_city', existingOrder.customer.city || '')
      setValue('delivery_fee', existingOrder.totals.delivery_fee)
      setValue('discount', existingOrder.totals.discount)

      if (existingOrder.items.length > 0) {
        setValue(
          'items',
          existingOrder.items.map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            unit_price: i.unit_price,
          }))
        )
      }
    }
  }, [existingOrder, setValue])

  // Debounced phone lookup
  useEffect(() => {
    if (!watchedPhone || watchedPhone.trim().length < 9) {
      return
    }

    const handler = setTimeout(async () => {
      try {
        setPhoneError(null)
        const res = await lookupCustomer(parsedShopId, watchedPhone)
        setLookupWarnings(res.warnings || [])
        if (res.customer) {
          if (res.customer.name) setValue('customer_name', res.customer.name)
          if (res.customer.email) setValue('customer_email', res.customer.email)
          if (res.customer.address) setValue('customer_address', res.customer.address)
          if (res.customer.city) setValue('customer_city', res.customer.city)
        }
      } catch (err) {
        if (apiError(err).status === 422) {
          setPhoneError('Please enter a valid Sri Lankan mobile number (e.g. 0771234567).')
        }
      }
    }, 450)

    return () => clearTimeout(handler)
  }, [watchedPhone, parsedShopId, setValue])

  const customerWarnings = lookupWarnings ?? existingOrder?.warnings ?? []
  const phoneTooShort = !watchedPhone || watchedPhone.trim().length < 9

  // Live total preview in integer cents, computed every render (cheap). Note: never wrap this in a useMemo
  // keyed on the items array: react-hook-form can keep the same array reference when a nested field changes.
  let subtotalCents = 0
  watchedItems.forEach((item) => {
    subtotalCents += toCents(item.unit_price || '0') * (Number(item.qty) || 1)
  })
  const feeCents = toCents(watchedDeliveryFee || '0')
  const discCents = toCents(watchedDiscount || '0')
  const totals = {
    subtotal: fromCents(subtotalCents),
    deliveryFee: fromCents(feeCents),
    discount: fromCents(discCents),
    total: fromCents(Math.max(0, subtotalCents + feeCents - discCents)),
  }

  const handleProductChange = (index: number, productId: number) => {
    const product = productsData?.data.find((p) => p.id === productId)
    if (product) {
      setValue(`items.${index}.product_id`, productId)
      setValue(`items.${index}.unit_price`, product.price)
    }
  }

  const onSubmit = async (values: FormValues) => {
    setStockError(null)
    setIsSubmitting(true)

    const payload: OrderInput = {
      channel: values.channel,
      payment_method_id: values.payment_method_id,
      customer: {
        phone: values.customer_phone,
        name: values.customer_name,
        email: values.customer_email || null,
        address: values.customer_address || null,
        city: values.customer_city || null,
      },
      items: values.items.map((i) => ({
        product_id: Number(i.product_id),
        qty: Number(i.qty),
        unit_price: i.unit_price,
      })),
      delivery_fee: values.delivery_fee,
      discount: values.discount,
      note: values.note || undefined,
      version: isEditing ? existingOrder?.version : undefined,
    }

    try {
      if (isEditing) {
        await updateOrder(parsedShopId, parsedOrderId, payload)
        toast.show('Order updated successfully.', 'success')
        navigate(`/shops/${parsedShopId}/orders/${parsedOrderId}`)
      } else {
        const created = await createOrder(parsedShopId, payload)
        toast.show(`Order ${created.number} created successfully.`, 'success')
        navigate(`/shops/${parsedShopId}/orders/${created.id}`)
      }
    } catch (err) {
      if (apiError(err).status === 409 && apiError(err).code === 'insufficient_stock') {
        setStockError(apiError(err).message || 'Insufficient stock for one or more items.')
      } else if (apiError(err).status === 409 && apiError(err).code === 'stale_version') {
        toast.show('Order was modified by someone else. Reloading...', 'danger')
        navigate(`/shops/${parsedShopId}/orders/${parsedOrderId}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEditing && isLoadingOrder) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    )
  }

  // The server decides editability (D16: until packed). Don't show a form that can only fail on save.
  if (isEditing && existingOrder && !existingOrder.available_actions.includes('edit')) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h1 className="text-lg font-bold text-gray-900">Order {existingOrder.number} can't be changed now</h1>
        <p className="text-sm text-gray-500">Orders can only be changed until they are packed.</p>
        <Button type="button" onClick={() => navigate(`/shops/${parsedShopId}/orders/${parsedOrderId}`)}>
          Back to order
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {isEditing ? `Edit Order #${existingOrder?.number}` : 'New Delivery Order'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter customer details, order lines, and payment method
            </p>
          </div>
        </div>
      </div>

      {/* Warnings Banner */}
      {customerWarnings.length > 0 && <WarningBanner warnings={customerWarnings} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information Section */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Customer Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone number (Local or E.164)"
              placeholder="0771234567"
              required
              error={(phoneTooShort ? null : phoneError) || errors.customer_phone?.message}
              helperText="Type phone to lookup existing customer details"
              {...register('customer_phone', { required: 'Phone is required' })}
            />

            <Input
              label="Customer Full Name"
              placeholder="e.g. Kasun Perera"
              required
              error={errors.customer_name?.message}
              {...register('customer_name', { required: 'Name is required' })}
            />

            <Input
              label="Delivery Address"
              placeholder="Street and house number"
              error={errors.customer_address?.message}
              {...register('customer_address')}
            />

            <Input
              label="City / Town"
              placeholder="e.g. Colombo, Kandy"
              error={errors.customer_city?.message}
              {...register('customer_city')}
            />

            <div className="sm:col-span-2">
              <Input
                label="Email address (Optional for e-bill)"
                type="email"
                placeholder="customer@example.com"
                error={errors.customer_email?.message}
                {...register('customer_email')}
              />
            </div>
          </div>
        </div>

        {/* Order Items Section */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Order Items</h2>
              <span className="text-xs text-gray-500">Add products to this order</span>
            </div>

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
            {fields.map((field, index) => {
              const currentProductId = watchedItems[index]?.product_id
              const productsList = productsData?.data || []
              const selectedProduct = productsList.find((p) => p.id === currentProductId)

              return (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                       Product {index + 1}
                    </label>
                    <select
                      aria-label={`Product ${index + 1}`}
                      className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      value={currentProductId || ''}
                      onChange={(e) => handleProductChange(index, Number(e.target.value))}
                    >
                      <option value="">Select a product...</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) &bull; Stock: {p.stock?.total ?? 0}
                        </option>
                      ))}
                    </select>
                    {selectedProduct && (
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        Stock available: <span className="font-semibold">{selectedProduct.stock?.total ?? 0}</span> units
                      </span>
                    )}
                  </div>

                  <div className="w-24">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      aria-label={`Quantity for item ${index + 1}`}
                      {...register(`items.${index}.qty`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="w-32">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      aria-label={`Unit price for item ${index + 1}`}
                      {...register(`items.${index}.unit_price`)}
                    />
                  </div>

                  <div className="w-28 text-right sm:pb-2">
                    <span className="text-xs text-gray-500 block">Line Total:</span>
                    <span className="text-xs font-bold text-gray-900 font-mono">
                      <MoneyDisplay
                        amount={fromCents(
                          toCents(watchedItems[index]?.unit_price || '0') *
                            (watchedItems[index]?.qty || 1)
                        )}
                      />
                    </span>
                  </div>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer self-end sm:self-center"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Pricing & Payment Method Section */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Payment & Charges
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Payment Method"
              required
              {...register('payment_method_id', { valueAsNumber: true })}
            >
              {paymentMethods?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.kind?.label || 'Active'})
                </option>
              ))}
            </Select>

            <Input
              label="Delivery Fee (LKR)"
              placeholder="350.00"
              {...register('delivery_fee')}
            />

            <Input
              label="Discount (LKR)"
              placeholder="0.00"
              {...register('discount')}
            />

            <div className="sm:col-span-3">
              <Input
                label="Order Note (Optional)"
                placeholder="Special delivery instructions or remarks"
                {...register('note')}
              />
            </div>
          </div>
        </div>

        {/* Live Total Preview Card & Submission */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-500 block">Subtotal</span>
              <MoneyDisplay amount={totals.subtotal} className="text-sm font-semibold" />
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Delivery</span>
              <MoneyDisplay amount={totals.deliveryFee} className="text-sm font-semibold" />
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Discount</span>
              <MoneyDisplay amount={totals.discount} className="text-sm font-semibold text-rose-600" />
            </div>

            <div className="border-l border-gray-200 pl-6">
              <span className="text-xs text-gray-500 block">Total Payable</span>
              <MoneyDisplay amount={totals.total} className="text-xl font-bold text-indigo-700" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<Save className="w-4 h-4" />}
            >
              {isEditing ? 'Save Changes' : 'Create Order'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
