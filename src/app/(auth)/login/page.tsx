'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post<{
        success: boolean
        data: { accessToken: string; refreshToken: string }
      }>('/api/v1/auth/login', { email, password })
      const { accessToken, refreshToken } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      router.push('/notes')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Login failed.')
      } else {
        setError('Login failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f] px-4">
      <div className="w-full max-w-sm bg-[#162d4a] rounded-2xl shadow-sm border border-blue-800 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-gray-400">Welcome back to AI Pro</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/40 border border-red-600 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-black text-white border border-blue-400 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full rounded-lg bg-black text-white border border-blue-400 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div
          onClick={handleLogin}
          className="w-full rounded-lg bg-blue-500 text-white text-sm font-medium py-2.5 text-center cursor-pointer hover:bg-blue-600 active:bg-blue-700 transition-colors select-none"
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </div>

        <p className="text-center text-sm text-gray-400">
          No account?{' '}
          <Link href="/register" className="text-blue-400 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
