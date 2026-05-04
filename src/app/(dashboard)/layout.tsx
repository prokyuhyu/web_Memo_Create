'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Files, Calendar, NotebookPen, RefreshCw, LogOut } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api-client'
import { ConflictModal } from '@/components/ConflictModal'

// ─── Sync queue context ────────────────────────────────────────────────────

type SyncItem = {
  id: string
  entityType: 'NOTE' | 'SCHEDULE'
  version: number
  updatedAt: string
  deletedAt?: string
  data: Record<string, unknown>
}

type SyncContextType = {
  addSyncItem: (item: SyncItem) => void
}

const SyncContext = createContext<SyncContextType>({ addSyncItem: () => {} })

export function useSyncQueue() {
  return useContext(SyncContext)
}

// ─── Types mirrored from sync engine ──────────────────────────────────────

type ConflictItem = {
  entityType: 'NOTE' | 'SCHEDULE'
  id: string
  clientItem: SyncItem
  serverItem: SyncItem
}

// ─── Layout ───────────────────────────────────────────────────────────────

const NAV = [
  { label: 'Notes', href: '/notes', Icon: NotebookPen },
  { label: 'Calendar', href: '/calendar', Icon: Calendar },
  { label: 'Files', href: '/files', Icon: Files },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [conflictsDeferred, setConflictsDeferred] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [pendingItems, setPendingItems] = useState<SyncItem[]>([])

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.replace('/login')
    }
    const stored = localStorage.getItem('lastSyncedAt')
    if (stored) setLastSynced(new Date(stored))
  }, [router])

  const addSyncItem = useCallback((item: SyncItem) => {
    setPendingItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id)
      return [...filtered, item]
    })
  }, [])

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncError('')

    const lastSyncedAt =
      localStorage.getItem('lastSyncedAt') ??
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

    try {
      const res = await api.post<{
        success: boolean
        data: {
          conflicts: ConflictItem[]
          syncedAt: string
          applied: SyncItem[]
          serverUpdates: SyncItem[]
          errors: { id: string; error: string }[]
        }
      }>('/sync', { lastSyncedAt, items: pendingItems })

      const { conflicts: newConflicts, syncedAt } = res.data.data

      localStorage.setItem('lastSyncedAt', syncedAt)
      setLastSynced(new Date(syncedAt))
      setPendingItems([])
      setConflictsDeferred(false)

      if (newConflicts.length > 0) {
        setConflicts(newConflicts)
      } else {
        setConflicts([])
      }
    } catch {
      setSyncError('Sync failed. Check your connection.')
    } finally {
      setSyncing(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('lastSyncedAt')
    router.replace('/login')
  }

  const showConflictModal = conflicts.length > 0 && !conflictsDeferred

  return (
    <SyncContext.Provider value={{ addSyncItem }}>
      <div className="flex h-screen overflow-hidden bg-[#1e3a5f]">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 flex flex-col bg-[#162d4a] border-r border-blue-800">
          {/* App name */}
          <div className="px-5 py-4 border-b border-blue-800">
            <span className="text-base font-bold text-white tracking-tight">AI Pro</span>
          </div>

          {/* Sync button */}
          <div className="px-3 pt-3 pb-2">
            <div
              onClick={handleSync}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 text-white text-sm font-medium py-2 cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-colors select-none"
              style={{ opacity: syncing ? 0.7 : 1, pointerEvents: syncing ? 'none' : 'auto' }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync'}
            </div>

            {/* Sync status */}
            <div className="mt-1.5 px-1 text-xs text-center">
              {syncError ? (
                <span className="text-red-500">{syncError}</span>
              ) : conflicts.length > 0 && !conflictsDeferred ? (
                <span className="text-amber-600">{conflicts.length} conflict(s) — resolve below</span>
              ) : conflicts.length > 0 && conflictsDeferred ? (
                <span className="text-amber-500">Sync paused — conflicts deferred</span>
              ) : lastSynced ? (
                <span className="text-gray-400">
                  Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
                </span>
              ) : (
                <span className="text-gray-400">Not synced yet</span>
              )}
            </div>

            {/* Pending badge */}
            {pendingItems.length > 0 && (
              <div className="mt-1 text-xs text-center text-blue-500">
                {pendingItems.length} pending change{pendingItems.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {NAV.map(({ label, href, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#4a90d9]/20 text-[#4a90d9]'
                      : 'text-gray-300 hover:bg-blue-900/40 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 pb-4">
            <div
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-blue-900/40 hover:text-white cursor-pointer transition-colors select-none"
            >
              <LogOut size={16} />
              Sign out
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Conflict modal — blocking overlay */}
      {showConflictModal && (
        <ConflictModal
          conflicts={conflicts}
          onResolved={() => setConflicts([])}
          onDefer={() => setConflictsDeferred(true)}
        />
      )}
    </SyncContext.Provider>
  )
}
