import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useQuery } from '@tanstack/react-query'
import { getAdminCouriers, updateAdminCourier } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { Edit2, ExternalLink } from 'lucide-react'
import type { Courier } from '@/api/types'

export function CouriersAdminPage() {
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null)
  const [template, setTemplate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: couriers, isLoading, refetch } = useQuery({
    queryKey: ['admin-couriers'],
    queryFn: getAdminCouriers,
  })

  const openEdit = (courier: Courier) => {
    setEditingCourier(courier)
    setTemplate(courier.tracking_url_template || '')
    setIsActive(courier.is_active)
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourier) return
    if (template && !template.includes('{tracking}')) {
      setError('Tracking URL template must contain "{tracking}".')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await updateAdminCourier(editingCourier.id, {
        tracking_url_template: template.trim(),
        is_active: isActive,
      })
      toast.show('Courier tracking pattern updated.', 'success')
      setEditingCourier(null)
      refetch()
    } catch (err) {
      setError(apiError(err).message || 'Failed to update courier.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const exampleLink = template.replace('{tracking}', 'TEST123')

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Couriers & Tracking Patterns</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure parcel tracking URL patterns for courier integrations (SPIKE-2)
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {couriers?.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                    <Badge tone="neutral" size="sm">
                      {c.code}
                    </Badge>
                    <Badge tone={c.is_active ? 'success' : 'neutral'} size="sm">
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="text-gray-500 font-mono text-[11px] truncate max-w-lg">
                    {c.tracking_url_template || (
                      <span className="italic text-gray-400">No tracking link pattern configured</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(c)}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit Pattern
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingCourier && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingCourier(null)}
          title={`Edit Courier: ${editingCourier.name}`}
          description="Update tracking URL template. It must include {tracking}."
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

            <Input
              label="Tracking URL Template"
              placeholder="https://track.courier.lk/status?tracking={tracking}"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              required
              helperText='Use "{tracking}" as the placeholder for parcel numbers'
              autoFocus
            />

            {template && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                <span className="font-semibold text-gray-700 block">Preview Sample Link:</span>
                <a
                  href={exampleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-600 hover:underline flex items-center gap-1 truncate"
                >
                  {exampleLink} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span>Courier is active and selectable for dispatch</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCourier(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Pattern
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
