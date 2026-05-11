'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'

type PinnedNotice = {
  id: string
  title: string
  body: string
  tags: string[]
  createdAt: string
  updatedAt: string
  user: { name: string; handle: string | null }
}

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<PinnedNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noteIdInput, setNoteIdInput] = useState('')
  const [pinning, setPinning] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const [unpinningId, setUnpinningId] = useState<string | null>(null)

  const fetchNotices = useCallback(async () => {
    const res = await fetch('/api/v1/admin/notices', {
      headers: getAuthHeader(),
    })
    const data = await res.json()
    if (data.success) {
      setNotices(data.data.notices)
      setError('')
    } else {
      setError(data.error ?? 'Failed to load notices')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotices().catch(() => {
      setError('Network error')
      setLoading(false)
    })
  }, [fetchNotices])

  async function handlePin() {
    const id = noteIdInput.trim()
    if (!id) return
    setPinning(true)
    setPinError('')
    setPinSuccess('')
    try {
      const res = await fetch('/api/v1/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ noteId: id }),
      })
      const data = await res.json()
      if (data.success) {
        setPinSuccess('Notice pinned successfully.')
        setNoteIdInput('')
        await fetchNotices()
      } else {
        setPinError(data.error ?? 'Failed to pin notice')
      }
    } catch {
      setPinError('Network error')
    } finally {
      setPinning(false)
    }
  }

  async function handleUnpin(noteId: string) {
    setUnpinningId(noteId)
    try {
      const res = await fetch('/api/v1/admin/notices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ noteId }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchNotices()
      } else {
        setError(data.error ?? 'Failed to unpin notice')
      }
    } catch {
      setError('Network error')
    } finally {
      setUnpinningId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e6edf3] mb-2">Admin — Pinned Notices</h1>
      <p className="text-[#8b949e] text-sm mb-6">
        Pin or unpin existing public notes as community notices.
      </p>

      {/* Pin form */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-6">
        <h2 className="text-[#e6edf3] font-semibold mb-3">Pin a note</h2>
        <p className="text-[#8b949e] text-xs mb-3">
          Enter the ID of an existing public note to pin it as a notice.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={noteIdInput}
            onChange={(e) => setNoteIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePin() }}
            placeholder="Note ID..."
            className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-3 py-2 text-sm placeholder-[#484f58] focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
          />
          <button
            onClick={handlePin}
            disabled={pinning || !noteIdInput.trim()}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pinning ? 'Pinning…' : 'Pin notice'}
          </button>
        </div>
        {pinError && (
          <p className="text-[#da3633] text-xs mt-2">{pinError}</p>
        )}
        {pinSuccess && (
          <p className="text-[#3fb950] text-xs mt-2">{pinSuccess}</p>
        )}
      </div>

      {/* Current pinned notices */}
      <h2 className="text-[#e6edf3] font-semibold mb-3">
        Current pinned notices ({notices.length})
      </h2>

      {error && (
        <div className="rounded-xl bg-[#da3633]/10 border border-[#da3633]/30 px-5 py-4 text-sm text-[#da3633] mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-sm text-[#8b949e]">불러오는 중…</div>
      ) : notices.length === 0 ? (
        <p className="text-[#8b949e] text-sm text-center py-10">
          No pinned notices yet.
        </p>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[#e6edf3] font-medium text-sm truncate">{notice.title}</p>
                <p className="text-[#8b949e] text-xs mt-0.5">
                  by {notice.user.name}
                  {notice.user.handle ? ` (@${notice.user.handle})` : ''}
                </p>
                <p className="text-[#484f58] text-xs mt-0.5">
                  {formatDistanceToNow(new Date(notice.createdAt), { addSuffix: true })}
                </p>
                <p className="text-[#484f58] text-xs font-mono mt-1 break-all">{notice.id}</p>
              </div>
              <button
                onClick={() => handleUnpin(notice.id)}
                disabled={unpinningId === notice.id}
                className="shrink-0 text-[#da3633] hover:text-[#ff7b72] text-sm font-medium transition-colors disabled:opacity-50"
              >
                {unpinningId === notice.id ? 'Unpinning…' : 'Unpin'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
