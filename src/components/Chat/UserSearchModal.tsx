'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '@/lib/api-client'

type User = { id: string; name: string; email: string }

type Props = {
  onClose: () => void
  onRoomOpened: (roomId: string, otherUser: { id: string; name: string }) => void
}

export default function UserSearchModal({ onClose, onRoomOpened }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .get<{ success: boolean; data: { users: User[] } }>('/chat/users')
      .then((r) => setUsers(r.data.data.users))
      .catch(() => {})
  }, [])

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleSelect(user: User) {
    if (loading) return
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: { roomId: string } }>(
        '/chat/rooms',
        { targetUserId: user.id },
      )
      onRoomOpened(res.data.data.roomId, { id: user.id, name: user.name })
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#e6edf3] font-semibold text-sm">새 대화 시작</span>
          <div
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] cursor-pointer p-1 rounded"
          >
            <X size={16} />
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 이메일 검색..."
          className="w-full bg-[#21262d] text-[#e6edf3] rounded-lg px-3 py-2 text-sm border border-[#30363d] focus:outline-none focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58] mb-2"
        />

        {/* User list */}
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-[#484f58] text-xs text-center py-4">사용자가 없습니다</p>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => handleSelect(u)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#21262d] cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[#e6edf3] text-sm font-medium truncate">{u.name}</p>
                  <p className="text-[#484f58] text-xs truncate">{u.email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
