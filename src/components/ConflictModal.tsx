'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import api from '@/lib/api-client'
import { format } from 'date-fns'

type SyncItem = {
  id: string
  entityType: 'NOTE' | 'SCHEDULE'
  version: number
  updatedAt: string
  deletedAt?: string
  data: Record<string, unknown>
}

type ConflictItem = {
  entityType: 'NOTE' | 'SCHEDULE'
  id: string
  clientItem: SyncItem
  serverItem: SyncItem
}

type Props = {
  conflicts: ConflictItem[]
  onResolved: () => void
  onDefer: () => void
}

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

function EntityLabel({ item }: { item: SyncItem }) {
  if (item.entityType === 'NOTE') {
    return (
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Title: </span>
          {String(item.data.title ?? '—')}
        </div>
        <div>
          <span className="font-medium">Updated: </span>
          {formatDate(item.updatedAt)}
        </div>
        <div>
          <span className="font-medium">Version: </span>v{item.version}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-1 text-sm">
      <div>
        <span className="font-medium">Title: </span>
        {String(item.data.title ?? '—')}
      </div>
      <div>
        <span className="font-medium">Start: </span>
        {item.data.startAt ? formatDate(String(item.data.startAt)) : '—'}
      </div>
      <div>
        <span className="font-medium">Updated: </span>
        {formatDate(item.updatedAt)}
      </div>
      <div>
        <span className="font-medium">Version: </span>v{item.version}
      </div>
    </div>
  )
}

export function ConflictModal({ conflicts, onResolved, onDefer }: Props) {
  const [resolving, setResolving] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  async function resolve(conflict: ConflictItem, resolution: 'SERVER' | 'CLIENT') {
    const key = conflict.id
    setResolving(key)
    setError('')
    try {
      await api.post('/sync/resolve', {
        entityType: conflict.entityType,
        entityId: conflict.id,
        resolution,
        ...(resolution === 'CLIENT' ? { clientData: conflict.clientItem.data } : {}),
      })
      const next = new Set(resolved)
      next.add(key)
      setResolved(next)
      if (next.size === conflicts.length) {
        onResolved()
      }
    } catch {
      setError(`Failed to resolve conflict for ${conflict.id}. Try again.`)
    } finally {
      setResolving(null)
    }
  }

  const pending = conflicts.filter((c) => !resolved.has(c.id))
  const doneCount = resolved.size

  return (
    // Fixed overlay — no click-outside dismiss, no X button
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-amber-50">
          <AlertTriangle className="text-amber-500 shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900">Sync conflicts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {doneCount} of {conflicts.length} resolved — you must resolve all before continuing
            </p>
          </div>
          <div
            onClick={onDefer}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer select-none underline underline-offset-2 shrink-0"
          >
            Defer (pauses sync)
          </div>
        </div>

        {/* Conflict list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {conflicts.map((conflict) => {
            const done = resolved.has(conflict.id)
            const busy = resolving === conflict.id
            return (
              <div
                key={conflict.id}
                className={`rounded-xl border p-4 space-y-3 ${done ? 'border-green-200 bg-green-50 opacity-60' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                    {conflict.entityType} · {conflict.id.slice(0, 8)}…
                  </span>
                  {done && (
                    <span className="text-xs text-green-600 font-medium">✓ Resolved</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Server version */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                      Server version
                    </div>
                    <EntityLabel item={conflict.serverItem} />
                    {!done && (
                      <div
                        onClick={() => !busy && resolve(conflict, 'SERVER')}
                        className="mt-3 text-center text-xs font-medium text-white bg-blue-600 rounded-lg py-1.5 cursor-pointer hover:bg-blue-700 transition-colors select-none"
                        style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }}
                      >
                        Keep Server
                      </div>
                    )}
                  </div>

                  {/* Client version */}
                  <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                    <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                      Your version
                    </div>
                    <EntityLabel item={conflict.clientItem} />
                    {!done && (
                      <div
                        onClick={() => !busy && resolve(conflict, 'CLIENT')}
                        className="mt-3 text-center text-xs font-medium text-white bg-purple-600 rounded-lg py-1.5 cursor-pointer hover:bg-purple-700 transition-colors select-none"
                        style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }}
                      >
                        Keep Mine
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {pending.length === 0 && (
            <div className="text-center py-8 text-sm text-green-600 font-medium">
              All conflicts resolved!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-center">
          Resolve all conflicts or defer to continue using the app
        </div>
      </div>
    </div>
  )
}
