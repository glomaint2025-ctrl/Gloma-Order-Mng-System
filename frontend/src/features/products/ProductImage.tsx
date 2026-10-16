import { useRef, useState } from 'react'
import { ImageIcon, Trash2, Upload } from 'lucide-react'
import type { Product } from '@/api/types'
import { deleteProductImage, uploadProductImage } from '@/api/products'
import { apiError } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'

export function ProductThumb({ product, size = 40 }: { product: Product; size?: number }) {
  const style = { width: size, height: size }
  return product.image_url ? (
    <img src={product.image_url} alt="" style={style} className="rounded-lg object-cover border border-gray-200 shrink-0" loading="lazy" />
  ) : (
    <div style={style} className="rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0" aria-hidden="true">
      <ImageIcon className="w-4 h-4 text-gray-400" />
    </div>
  )
}

/** Photo upload/remove inside the product dialog (admin). Saves immediately, separately from the form. */
export function ProductImageField({
  shopId,
  product,
  onChange,
}: {
  shopId: number
  product: Product
  onChange: (updated: Product) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const run = async (task: () => Promise<Product>, done: string) => {
    setBusy(true)
    try {
      onChange(await task())
      toast.show(done, 'success')
    } catch (err) {
      const info = apiError(err)
      toast.show(info.errors?.image?.[0] ?? info.message ?? 'Could not update the photo.', 'danger')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <ProductThumb product={product} size={64} />
      <div className="flex-1 space-y-1.5">
        <div className="text-xs font-semibold text-gray-800">Product photo</div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id={`product-image-${product.id}`}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) run(() => uploadProductImage(shopId, product.id, file), 'Photo saved.')
            }}
          />
          <Button type="button" variant="outline" size="sm" isLoading={busy} icon={<Upload className="w-3.5 h-3.5" />} onClick={() => input.current?.click()}>
            {product.image_url ? 'Replace photo' : 'Upload photo'}
          </Button>
          {product.image_url && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => run(() => deleteProductImage(shopId, product.id), 'Photo removed.')}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-[11px] text-gray-500">JPG, PNG or WebP, up to 2 MB.</p>
      </div>
    </div>
  )
}
