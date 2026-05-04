'use client'

import { useEffect } from 'react'

type ToastProps = {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

const bgMap = {
  success: 'bg-[#238636]',
  error: 'bg-[#da3633]',
  info: 'bg-[#1f6feb]',
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${bgMap[type]} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-slide-up`}
    >
      {message}
    </div>
  )
}
