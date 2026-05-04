'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setError('')
    if (!name || !email || !password) {
      setError('All fields are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/v1/auth/register', { name, email, password })
      router.push('/login')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Registration failed.')
      } else {
        setError('Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRegister()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4">
      <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#7c3aed]">AI Pro</h1>
          <p className="mt-1 text-sm text-[#8b949e]">Create your account</p>
        </div>

        {error && (
          <div className="bg-[#da3633]/10 border border-[#da3633]/30 text-[#da3633] rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[#8b949e] text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your name"
              className="w-full bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58]"
            />
          </div>
          <div>
            <label className="block text-[#8b949e] text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              className="w-full bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58]"
            />
          </div>
          <div>
            <label className="block text-[#8b949e] text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Min. 8 characters"
              className="w-full bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58]"
            />
          </div>
        </div>

        <div
          onClick={handleRegister}
          className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium py-2 rounded-lg transition-colors text-sm text-center cursor-pointer select-none"
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </div>

        <p className="text-center text-sm text-[#8b949e]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#7c3aed] hover:text-[#6d28d9] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
