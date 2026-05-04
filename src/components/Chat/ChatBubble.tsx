'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import ChatPanel from './ChatPanel'

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload?.userId) setCurrentUserId(payload.userId)
    } catch {
      // token not decodable
    }
  }, [])

  if (!currentUserId) return null

  return (
    <>
      {isOpen && (
        <ChatPanel
          currentUserId={currentUserId}
          onUnreadChange={setUnreadCount}
        />
      )}

      <div
        onClick={() => {
          setIsOpen((o) => !o)
          if (!isOpen) setUnreadCount(0)
        }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] shadow-lg flex items-center justify-center cursor-pointer transition-all select-none"
      >
        <MessageCircle size={24} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </>
  )
}
