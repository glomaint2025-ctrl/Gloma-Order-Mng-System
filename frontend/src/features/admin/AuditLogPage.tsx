import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/api/admin'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/date'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  // Expandable row state
  const [expandedLogIds, setExpandedLogIds] = useState<number[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', { actionFilter, from, to, page }],
    queryFn: () =>
      getAuditLogs({
        action: actionFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
      }),
  })

  const logs = data?.data || []

  const toggleExpand = (id: number) => {
    setExpandedLogIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Audit Log</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Immutable audit trail of state changes, order transitions, and administrative operations
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by action (e.g. order., auth., shop.)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">From:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="px-2 py-1 rounded border border-gray-300 bg-white"
          />
          <span className="text-gray-500 font-medium">To:</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            className="px-2 py-1 rounded border border-gray-300 bg-white"
          />
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit entries" description="Try clearing action or date filters." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="w-8 px-3 py-3"></th>
                <th scope="col" className="px-3 py-3">Timestamp</th>
                <th scope="col" className="px-3 py-3">Action</th>
                <th scope="col" className="px-3 py-3">User</th>
                <th scope="col" className="px-3 py-3">Shop</th>
                <th scope="col" className="px-3 py-3">Subject</th>
                <th scope="col" className="px-3 py-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.map((log) => {
                const isExpanded = expandedLogIds.includes(log.id)
                const hasChanges = Boolean(log.changes)

                return (
                  <tbody key={log.id} className="divide-y divide-gray-100">
                    <tr
                      onClick={() => hasChanges && toggleExpand(log.id)}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        hasChanges ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-gray-400 text-center">
                        {hasChanges ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )
                        ) : null}
                      </td>

                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="px-3 py-3 font-mono font-semibold text-gray-900">
                        {log.action}
                      </td>

                      <td className="px-3 py-3 font-medium text-gray-800">
                        {log.user?.name || 'System'}
                      </td>

                      <td className="px-3 py-3 text-gray-600">
                        {log.shop?.name || 'Global'}
                      </td>

                      <td className="px-3 py-3 text-gray-500 font-mono text-[11px]">
                        {log.subject ? `${log.subject.type} #${log.subject.id}` : '—'}
                      </td>

                      <td className="px-3 py-3 text-right text-gray-400 font-mono text-[11px]">
                        {log.ip || '—'}
                      </td>
                    </tr>

                    {/* Expandable Changes Row */}
                    {isExpanded && log.changes && (
                      <tr className="bg-gray-50/80">
                        <td colSpan={7} className="px-6 py-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                            Recorded Changes:
                          </span>
                          <pre className="text-[11px] font-mono text-gray-800 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </tbody>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
