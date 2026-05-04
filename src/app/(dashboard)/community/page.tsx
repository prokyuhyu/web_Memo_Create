'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Tag } from 'lucide-react'

type Post = {
  id: string
  title: string
  body: string
  tags: string[]
  authorName: string
  createdAt: string
  updatedAt: string
}

type CommunityResponse = {
  success: boolean
  data: { posts: Post[]; total: number; page: number; limit: number }
}

async function fetchPosts(page: number, search: string): Promise<CommunityResponse> {
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  const res = await fetch(`/api/v1/community?${params}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  // 500ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

  // Reset and fetch on search change
  useEffect(() => {
    setPage(1)
    setPosts([])
    setLoading(true)
    fetchPosts(1, debouncedSearch)
      .then((data) => {
        setPosts(data.data.posts)
        setTotal(data.data.total)
      })
      .catch(() => setError('불러오기에 실패했습니다.'))
      .finally(() => setLoading(false))
  }, [debouncedSearch])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setLoadingMore(true)
    fetchPosts(nextPage, debouncedSearch)
      .then((data) => {
        setPosts((prev) => [...prev, ...data.data.posts])
        setTotal(data.data.total)
        setPage(nextPage)
      })
      .catch(() => setError('불러오기에 실패했습니다.'))
      .finally(() => setLoadingMore(false))
  }, [page, debouncedSearch])

  const hasMore = posts.length < total

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e6edf3] mb-2">커뮤니티</h1>
      <p className="text-[#8b949e] text-sm mb-6">공개된 노트들을 모아볼 수 있는 공간입니다</p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="검색..."
        className="bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-4 py-2 w-full max-w-md mb-6 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58] text-sm"
      />

      {error && (
        <div className="rounded-xl bg-[#da3633]/10 border border-[#da3633]/30 px-5 py-4 text-sm text-[#da3633] mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-sm text-[#8b949e]">불러오는 중…</div>
      )}

      {!loading && posts.length === 0 && (
        <p className="text-[#8b949e] text-center py-12">아직 공개된 노트가 없습니다</p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#7c3aed]/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#7c3aed]/20 text-[#7c3aed] text-xs px-2 py-0.5 rounded-full">
                by {post.authorName}
              </span>
            </div>

            <h2 className="text-[#e6edf3] font-semibold text-lg mb-2">{post.title}</h2>

            <p className="text-[#8b949e] text-sm leading-relaxed mb-3">
              {post.body.length >= 200 ? post.body + '…' : post.body}
            </p>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-[#21262d] text-[#8b949e] text-xs px-2 py-0.5 rounded-full"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <span className="text-[#484f58] text-xs">
              {formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingMore ? '불러오는 중…' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  )
}
