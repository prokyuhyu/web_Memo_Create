'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'

type UserProfile = {
  id: string
  handle: string | null
  email: string
  name: string
  role: 'USER' | 'ADMIN' | 'ROOT'
  createdAt: string
  updatedAt: string
}

const ROLE_STYLE: Record<UserProfile['role'], string> = {
  ROOT: 'bg-red-500/20 text-red-400 border border-red-500/30',
  ADMIN: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  USER: 'bg-[#21262d] text-[#8b949e] border border-[#30363d]',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[#484f58] uppercase tracking-wider">{label}</span>
      <span className="text-[#e6edf3] text-sm">{value ?? <span className="text-[#484f58]">—</span>}</span>
    </div>
  )
}

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      router.replace('/login')
      return
    }

    fetch('/api/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUser(data.data.user)
        else setError(data.error ?? 'Failed to load profile')
      })
      .catch(() => setError('Failed to load profile'))
  }, [router])

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-[#e6edf3] mb-1">My Page</h1>
      <p className="text-[#8b949e] text-sm mb-6">Your account information</p>

      {error && (
        <div className="rounded-xl bg-[#da3633]/10 border border-[#da3633]/30 px-4 py-3 text-sm text-[#da3633] mb-4">
          {error}
        </div>
      )}

      {!user && !error && (
        <div className="text-[#8b949e] text-sm">Loading…</div>
      )}

      {user && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-5">
          {/* Role badge */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_STYLE[user.role]}`}>
              {user.role}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" value={user.name} />
            <Field label="Handle" value={user.handle ? `@${user.handle}` : null} />
            <Field label="Email" value={user.email} />
            <Field label="Internal ID" value={<span className="font-mono text-xs text-[#8b949e]">{user.id}</span>} />
            <Field
              label="Member since"
              value={format(new Date(user.createdAt), 'yyyy-MM-dd')}
            />
            <Field
              label="Last updated"
              value={formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
