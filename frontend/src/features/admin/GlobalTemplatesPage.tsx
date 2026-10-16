import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useQuery } from '@tanstack/react-query'
import { getGlobalTemplates, saveGlobalTemplate } from '@/api/admin'
import { getMeta } from '@/api/meta'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { calculateSmsSegments } from '@/lib/sms'
import { Edit2 } from 'lucide-react'
import type { MessageTemplate } from '@/api/types'

export function GlobalTemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['admin-global-templates'],
    queryFn: getGlobalTemplates,
  })

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: getMeta,
  })

  const openEdit = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl)
    setSubject(tpl.subject || '')
    setBody(tpl.body)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate || !body.trim()) return

    setIsSubmitting(true)
    try {
      await saveGlobalTemplate({
        event: editingTemplate.event.value,
        channel: editingTemplate.channel.value,
        subject: subject.trim() || null,
        body: body.trim(),
      })
      toast.show('Global default template saved.', 'success')
      setEditingTemplate(null)
      refetch()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to save template.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  const smsCalc = calculateSmsSegments(body)

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Global Message Templates</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Default notifications sent across all partner shops unless overridden at the shop level
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden divide-y divide-gray-100">
          {templates?.map((tpl) => (
            <div key={tpl.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{tpl.event.label}</span>
                  <Badge tone={tpl.channel.value === 'sms' ? 'primary' : 'info'} size="sm">
                    {tpl.channel.label}
                  </Badge>
                </div>
                {tpl.subject && (
                  <div className="text-gray-700 font-medium">Subject: {tpl.subject}</div>
                )}
                <p className="text-gray-600 line-clamp-2 font-mono text-[11px]">"{tpl.body}"</p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEdit(tpl)}
                icon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Default
              </Button>
            </div>
          ))}
        </div>
      )}

      {editingTemplate && (
        <Dialog
          isOpen={true}
          onClose={() => setEditingTemplate(null)}
          title={`Edit Global Default: ${editingTemplate.event.label} (${editingTemplate.channel.label})`}
          description="Changes apply to all shops that don't have a customized template."
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {editingTemplate.channel.value === 'email' && (
              <Input
                label="Email Subject"
                placeholder="e.g. Your order is confirmed"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Message Body
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-300 p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                required
              />
            </div>

            {editingTemplate.channel.value === 'sms' && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-800">
                    {smsCalc.segments} SMS {smsCalc.segments === 1 ? 'segment' : 'segments'}
                  </span>
                  <span className="text-gray-500 block text-[11px] mt-0.5">
                    {smsCalc.characterCount} chars ({smsCalc.remainingInSegment} left in current part)
                  </span>
                </div>
                <Badge tone={smsCalc.isUnicode ? 'warning' : 'neutral'} size="sm">
                  {smsCalc.isUnicode ? 'Unicode (Sinhala/Tamil/Emoji)' : 'GSM-7 (Standard)'}
                </Badge>
              </div>
            )}

            {meta?.template_placeholders && (
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Placeholders:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {meta.template_placeholders.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setBody((prev) => `${prev} ${ph}`)}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono text-[11px] cursor-pointer"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Global Template
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
