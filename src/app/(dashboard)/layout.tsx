'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Files,
  Calendar,
  NotebookPen,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
  User,
  Shield,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api-client'
import { ConflictModal } from '@/components/ConflictModal'
import ChatBubble from '@/components/Chat/ChatBubble'

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

// ─── Nav definition ───────────────────────────────────────────────────────

type NavItem = { label: string; href: string; Icon: React.ElementType }

const BASE_NAV: NavItem[] = [
  { label: '커뮤니티', href: '/community', Icon: Users },
  { label: 'Files', href: '/files', Icon: Files },
  { label: 'Calendar', href: '/calendar', Icon: Calendar },
  { label: 'Notes', href: '/notes', Icon: NotebookPen },
  { label: 'My Page', href: '/my', Icon: User },
]

function decodeTokenPayload(token: string): { userId?: string; role?: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// ─── Layout ───────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [conflictsDeferred, setConflictsDeferred] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [pendingItems, setPendingItems] = useState<SyncItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return null
      return decodeTokenPayload(token)?.role ?? null
    } catch {
      return null
    }
  })

  // Auth guard + screen size detection
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login')
      return
    }
    const payload = decodeTokenPayload(token)
    setUserRole(payload?.role ?? null)

    const stored = localStorage.getItem('lastSyncedAt')
    if (stored) setLastSynced(new Date(stored))
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [router])

  const navItems: NavItem[] = [
    ...BASE_NAV,
    ...(userRole === 'ROOT'
      ? [{ label: 'Admin', href: '/admin/users', Icon: Shield }]
      : []),
  ]

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
      <div className="flex h-screen bg-[#0d1117]">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            shrink-0 flex flex-col bg-[#161b22] border-r border-[#30363d]
            transition-all duration-300 ease-in-out overflow-hidden relative z-20
            ${sidebarOpen ? 'w-64 p-4' : 'w-0 md:w-16 md:p-2'}
            fixed md:static h-full
          `}
        >
          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="absolute top-3 right-2 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] rounded-lg p-1.5 z-30 hidden md:flex items-center justify-center"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* App name */}
          <div className={`mb-6 ${sidebarOpen ? '' : 'md:hidden'}`}>
            <span className="text-[#e6edf3] font-bold text-lg whitespace-nowrap">AI Pro</span>
          </div>

          {/* Sync button */}
          <div className={`mb-3 ${sidebarOpen ? '' : 'md:hidden'}`}>
            <div
              onClick={handleSync}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium py-2 px-3 cursor-pointer transition-colors select-none"
              style={{ opacity: syncing ? 0.7 : 1, pointerEvents: syncing ? 'none' : 'auto' }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync'}
            </div>

            {/* Sync status */}
            <div className="mt-1.5 px-1 text-xs text-center">
              {syncError ? (
                <span className="text-[#da3633]">{syncError}</span>
              ) : conflicts.length > 0 && !conflictsDeferred ? (
                <span className="text-amber-500">{conflicts.length} conflict(s) — resolve below</span>
              ) : conflicts.length > 0 && conflictsDeferred ? (
                <span className="text-amber-500">Sync paused — conflicts deferred</span>
              ) : lastSynced ? (
                <span className="text-[#8b949e]">
                  Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
                </span>
              ) : (
                <span className="text-[#8b949e]">Not synced yet</span>
              )}
            </div>

            {/* Pending badge */}
            {pendingItems.length > 0 && (
              <div className="mt-1 text-xs text-center text-[#7c3aed]">
                {pendingItems.length} pending change{pendingItems.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Collapsed desktop: sync icon only */}
          {!sidebarOpen && (
            <div className="hidden md:flex flex-col items-center mb-3 mt-8">
              <div
                onClick={handleSync}
                title="Sync"
                className="flex items-center justify-center rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white p-2 cursor-pointer transition-colors select-none"
                style={{ opacity: syncing ? 0.7 : 1, pointerEvents: syncing ? 'none' : 'auto' }}
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className={`flex-1 space-y-0.5 ${sidebarOpen ? '' : 'md:flex md:flex-col md:items-center md:space-y-1'}`}>
            {navItems.map(({ label, href, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  title={!sidebarOpen ? label : undefined}
                  className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                    sidebarOpen ? 'gap-2 px-3 py-2' : 'md:justify-center md:p-2'
                  } ${
                    active
                      ? `bg-[#21262d] text-[#e6edf3] ${sidebarOpen ? 'border-l-2 border-[#7c3aed]' : ''}`
                      : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                  }`}
                >
                  <Icon size={16} />
                  {sidebarOpen && <span>{label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div>
            <div
              onClick={handleLogout}
              title={!sidebarOpen ? 'Sign out' : undefined}
              className={`flex items-center rounded-lg text-sm font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] cursor-pointer transition-colors select-none ${
                sidebarOpen ? 'gap-2 px-3 py-2' : 'md:justify-center md:p-2'
              }`}
            >
              <LogOut size={16} />
              {sidebarOpen && <span>Sign out</span>}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-[#0d1117] p-6 overflow-auto">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden mb-4 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] rounded-lg p-1.5"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          {children}
        </main>
      </div>

      {/* Conflict modal — blocking overlay */}
      {showConflictModal && (
        <ConflictModal
          conflicts={conflicts}
          onResolved={() => setConflicts([])}
          onDefer={() => setConflictsDeferred(true)}
        />
      )}

      <ChatBubble />
    </SyncContext.Provider>
  )
}
