'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      router.replace('/notes')
    } else {
      router.replace('/login')
    }
  }, [router])

  return null
}
