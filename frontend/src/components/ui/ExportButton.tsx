import { useState } from 'react'
import { Download } from 'lucide-react'
import { downloadFile } from '@/api/download'
import { apiError } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { Button } from './Button'

/** "Export CSV" for the list on screen: sends the same filters the list uses, so the file matches. */
export function ExportButton({ url, params, label = 'Export CSV' }: { url: string; params?: object; label?: string }) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await downloadFile(url, params)
    } catch (err) {
      toast.show(apiError(err).message ?? 'Export failed. Try again.', 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} isLoading={busy} icon={<Download className="w-3.5 h-3.5" />}>
      {label}
    </Button>
  )
}
