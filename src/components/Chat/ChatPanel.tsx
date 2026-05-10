'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, PenSquare, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api-client'
import { getPusherClient } from '@/lib/pusher-client'
import UserSearchModal from './UserSearchModal'

type Message = {
  id: string
  content: string
  senderId: string
  senderName: string
  createdAt: string
  isPending?: boolean
  isFailed?: boolean
}

type Room = {
  id: string
  otherUser: { id: string; name: string } | null
  lastMessage: { content: string; createdAt: string } | null
  updatedAt: string
}

type Props = {
  currentUserId: string
  onUnreadChange: (count: number) => void
}

export default function ChatPanel({ currentUserId, onUnreadChange }: Props) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<{ id: string; otherUser: { id: string; name: string } } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [unreadRooms, setUnreadRooms] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { rooms: Room[] } }>('/chat/rooms')
      setRooms(res.data.data.rooms)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // Update unread count
  useEffect(() => {
    onUnreadChange(unreadRooms.size)
  }, [unreadRooms, onUnreadChange])

  const isSameOutgoingPending = useCallback(
    (pending: Message, incoming: Message) => {
      return (
        pending.senderId === currentUserId &&
        incoming.senderId === currentUserId &&
        pending.content === incoming.content &&
        (pending.isPending || pending.isFailed)
      )
    },
    [currentUserId],
  )
  
  const upsertMessage = useCallback(
    (prev: Message[], incoming: Message) => {
      if (prev.some((m) => m.id === incoming.id)) {
        return prev.map((m) =>
          m.id === incoming.id ? { ...incoming, isPending: false, isFailed: false } : m
        )
      }
  
      const pendingIndex = prev.findIndex((m) => isSameOutgoingPending(m, incoming))
      if (pendingIndex !== -1) {
        return prev.map((m, i) =>
          i === pendingIndex ? { ...incoming, isPending: false, isFailed: false } : m
        )
      }
  
      return [...prev, incoming]
    },
    [isSameOutgoingPending],
  )

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await api.get<{ success: boolean; data: { messages: Message[] } }>(
        `/chat/rooms/${roomId}/messages`,
      )
      const serverMessages = res.data.data.messages

      setMessages((prev) => {
        const stillPending = prev.filter((m) => {
          if (!m.isPending && !m.isFailed) return false
      
          const alreadyArrived = serverMessages.some(
            (serverMsg) =>
              serverMsg.id === m.id ||
              (
                serverMsg.senderId === currentUserId &&
                m.senderId === currentUserId &&
                serverMsg.content === m.content
              )
          )
      
          return !alreadyArrived
        })
      
        return [...serverMessages, ...stillPending]
      })
    } catch {
      // silent
    }
  }, [currentUserId])

  // Enter chat room
  function openRoom(room: Room) {
    if (!room.otherUser) return
    setActiveRoom({ id: room.id, otherUser: room.otherUser })
    setUnreadRooms((prev) => {
      const next = new Set(prev)
      next.delete(room.id)
      return next
    })
  }

  // Pusher + polling when in a room
  useEffect(() => {
    if (!activeRoom) return

    fetchMessages(activeRoom.id)

    const pusher = getPusherClient()
    const channel = pusher.subscribe(`chat-room-${activeRoom.id}`)

    channel.bind('new-message', (data: Message) => {
      setMessages((prev) => upsertMessage(prev, data))
    })

    pollRef.current = setInterval(() => fetchMessages(activeRoom.id), 3000)

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`chat-room-${activeRoom.id}`)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeRoom, fetchMessages, upsertMessage])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(retryContent?: string) {
    const content = retryContent ?? inputText.trim()
    if (!content || !activeRoom) return

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      senderId: currentUserId,
      senderName: '',
      createdAt: new Date().toISOString(),
      isPending: true,
    }

    if (!retryContent) setInputText('')
    setMessages((prev) =>
      retryContent
        ? prev.map((m) => m.content === content && m.isFailed ? { ...optimisticMessage } : m)
        : [...prev, optimisticMessage]
    )

    try {
      const res = await api.post<{ success: boolean; data: { message: Message } }>(
        `/chat/rooms/${activeRoom.id}/messages`,
        { content },
      )
      setMessages((prev) => {
        const saved = { ...res.data.data.message, isPending: false, isFailed: false }
      
        // temp 메시지가 있으면 saved로 교체하되,
        // 이미 Pusher로 같은 saved id가 들어와 있으면 temp는 제거
        if (prev.some((m) => m.id === tempId)) {
          const withoutDuplicateSaved = prev.filter((m) => m.id !== saved.id)
          return withoutDuplicateSaved.map((m) => (m.id === tempId ? saved : m))
        }
      
        return upsertMessage(prev, saved)
      })
      fetchRooms()
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, isFailed: true, isPending: false } : m)
      )
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleRoomOpened(roomId: string, otherUser: { id: string; name: string }) {
    setShowSearch(false)
    setActiveRoom({ id: roomId, otherUser })
    fetchRooms()
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 h-[480px] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {!activeRoom ? (
        /* ── Room list view ── */
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] shrink-0">
            <span className="text-[#e6edf3] font-semibold text-sm">메시지</span>
            <div
              onClick={() => setShowSearch(true)}
              className="text-[#8b949e] hover:text-[#e6edf3] cursor-pointer p-1 rounded transition-colors"
              title="새 대화"
            >
              <PenSquare size={16} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#484f58] text-xs gap-2">
                <p>대화가 없습니다</p>
                <div
                  onClick={() => setShowSearch(true)}
                  className="text-[#7c3aed] hover:text-[#6d28d9] cursor-pointer"
                >
                  새 대화 시작
                </div>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => openRoom(room)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#21262d] cursor-pointer transition-colors border-b border-[#21262d]"
                >
                  <div className="w-9 h-9 rounded-full bg-[#7c3aed] flex items-center justify-center text-white text-sm font-bold shrink-0 relative">
                    {room.otherUser?.name[0]?.toUpperCase()}
                    {unreadRooms.has(room.id) && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[#e6edf3] text-sm font-medium truncate">
                        {room.otherUser?.name ?? '알 수 없음'}
                      </p>
                      {room.lastMessage && (
                        <span className="text-[#484f58] text-xs shrink-0 ml-1">
                          {formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    {room.lastMessage && (
                      <p className="text-[#484f58] text-xs truncate">{room.lastMessage.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* ── Chat view ── */
        <>
          <div className="flex items-center gap-2 px-3 py-3 border-b border-[#30363d] shrink-0">
            <div
              onClick={() => {
                setActiveRoom(null)
                setMessages([])
              }}
              className="text-[#8b949e] hover:text-[#e6edf3] cursor-pointer p-1 rounded transition-colors"
            >
              <ChevronLeft size={18} />
            </div>
            <div className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {activeRoom.otherUser.name[0]?.toUpperCase()}
            </div>
            <span className="text-[#e6edf3] text-sm font-semibold truncate">
              {activeRoom.otherUser.name}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && (
                    <span className="text-[#8b949e] text-xs mb-1 px-1">{msg.senderName}</span>
                  )}
                  <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`px-3 py-2 max-w-[70%] text-sm break-words ${
                        isMine
                          ? 'bg-[#7c3aed] text-white rounded-2xl rounded-br-sm'
                          : 'bg-[#21262d] text-[#e6edf3] rounded-2xl rounded-bl-sm'
                      } ${msg.isFailed ? 'border border-red-500' : ''}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  {msg.isFailed && (
                    <button
                      onClick={() => sendMessage(msg.content)}
                      className="text-red-400 text-xs mt-0.5 px-1 hover:text-red-300 transition-colors"
                    >
                      전송 실패 · 다시 시도
                    </button>
                  )}
                  {!msg.isFailed && (
                    <span className="text-[#484f58] text-xs mt-0.5 px-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-[#0d1117] border-t border-[#30363d] p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              className="flex-1 bg-[#21262d] text-[#e6edf3] rounded-full px-4 py-2 text-sm border-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58]"
            />
            <div
              onClick={() => sendMessage()}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full p-2 cursor-pointer transition-colors flex items-center justify-center shrink-0"
            >
              <Send size={16} className="text-white" />
            </div>
          </div>
        </>
      )}

      {showSearch && (
        <UserSearchModal onClose={() => setShowSearch(false)} onRoomOpened={handleRoomOpened} />
      )}
    </div>
  )
}
