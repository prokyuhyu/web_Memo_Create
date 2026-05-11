'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type UserRole = 'USER' | 'ADMIN' | 'ROOT'

type AdminUser = {
  id: string
  handle: string | null
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

const ROLES: UserRole[] = ['USER', 'ADMIN', 'ROOT']

const ROLE_STYLE: Record<UserRole, string> = {
  ROOT: 'bg-red-500/20 text-red-400 border border-red-500/30',
  ADMIN: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  USER: 'bg-[#21262d] text-[#8b949e] border border-[#30363d]',
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { router.replace('/login'); return }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'ROOT') { router.replace('/'); return }
      setCurrentUserId(payload.userId ?? null)
    } catch {
      router.replace('/login')
      return
    }

    fetch('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUsers(data.data.users)
        else setPageError(data.error ?? 'Failed to load users')
      })
      .catch(() => setPageError('Failed to load users'))
      .finally(() => setLoading(false))
  }, [router])

  const changeRole = useCallback(
    async (targetUserId: string, newRole: UserRole) => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      setSaving((s) => ({ ...s, [targetUserId]: true }))
      setRoleErrors((e) => ({ ...e, [targetUserId]: '' }))

      try {
        const res = await fetch('/api/v1/admin/roles', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetUserId, role: newRole }),
        })
        const data = await res.json()

        if (data.success) {
          setUsers((prev) =>
            prev.map((u) => (u.id === targetUserId ? { ...u, role: data.data.newRole } : u))
          )
        } else {
          setRoleErrors((e) => ({ ...e, [targetUserId]: data.error ?? 'Failed to update role' }))
        }
      } catch {
        setRoleErrors((e) => ({ ...e, [targetUserId]: 'Network error' }))
      } finally {
        setSaving((s) => ({ ...s, [targetUserId]: false }))
      }
    },
    []
  )

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          (u.handle ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-[#e6edf3] mb-1">Admin — Users</h1>
      <p className="text-[#8b949e] text-sm mb-6">
        Manage user roles. Role changes take effect on the user's next login or token refresh.
      </p>

      {pageError && (
        <div className="rounded-xl bg-[#da3633]/10 border border-[#da3633]/30 px-4 py-3 text-sm text-[#da3633] mb-4">
          {pageError}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email, name, or handle…"
        className="bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-4 py-2 w-full max-w-sm mb-5 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58] text-sm"
      />

      {loading && <p className="text-[#8b949e] text-sm">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-[#8b949e] text-sm">No users found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_1.4fr_100px_120px_80px] gap-3 px-4 py-2 text-xs text-[#484f58] uppercase tracking-wider">
            <span>User</span>
            <span>Email</span>
            <span>Joined</span>
            <span>Role</span>
            <span />
          </div>

          {filtered.map((user) => {
            const isSelf = user.id === currentUserId
            const err = roleErrors[user.id]
            const busy = saving[user.id] ?? false

            return (
              <div
                key={user.id}
                className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_100px_120px_80px] gap-2 sm:gap-3 items-center"
              >
                {/* Name + uid */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[#e6edf3] text-sm font-medium truncate">{user.name}</span>
                  {user.handle && (
                    <span className="text-[#484f58] text-xs">@{user.handle}</span>
                  )}
                </div>

                {/* Email */}
                <span className="text-[#8b949e] text-sm truncate">{user.email}</span>

                {/* Joined */}
                <span className="text-[#484f58] text-xs">{format(new Date(user.createdAt), 'yyyy-MM-dd')}</span>

                {/* Role badge / select */}
                <div className="flex flex-col gap-1">
                  {isSelf ? (
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${ROLE_STYLE[user.role]}`}
                      title="Cannot change your own ROOT role"
                    >
                      {user.role}
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      disabled={busy}
                      onChange={(e) => changeRole(user.id, e.target.value as UserRole)}
                      className="bg-[#21262d] border border-[#30363d] text-[#e6edf3] text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#7c3aed] disabled:opacity-50 cursor-pointer"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                  {err && <span className="text-[#da3633] text-xs">{err}</span>}
                </div>

                {/* Status */}
                <div className="text-xs text-[#484f58]">
                  {busy ? (
                    <span className="text-[#7c3aed]">Saving…</span>
                  ) : isSelf ? (
                    <span title="This is your account">you</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-[#484f58]">
        {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
        {' · '}Role changes are enforced server-side on every request.
      </p>
    </div>
  )
}
