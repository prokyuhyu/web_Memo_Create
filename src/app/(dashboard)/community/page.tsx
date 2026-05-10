'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { formatDistanceToNow } from 'date-fns'
import { Tag, X } from 'lucide-react'

type Post = {
  id: string
  title: string
  body: string
  tags: string[]
  authorName: string
  createdAt: string
  updatedAt: string
}

type Comment = {
  id: string
  content: string
  authorName: string
  userId: string
  createdAt: string
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

function getCurrentUserId(): string | null {
  try {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.userId ?? decoded.sub ?? null
  } catch {
    return null
  }
}

type PostModalProps = {
  post: Post
  comments: Comment[]
  isLoadingComments: boolean
  currentUserId: string | null
  commentInput: string
  onClose: () => void
  onCommentInputChange: (value: string) => void
  onSubmitComment: () => void
  onDeleteComment: (commentId: string) => void
}

function PostModal({
  post,
  comments,
  isLoadingComments,
  currentUserId,
  commentInput,
  onClose,
  onCommentInputChange,
  onSubmitComment,
  onDeleteComment,
}: PostModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — 고정 */}
        <div
          style={{ padding: '24px', borderBottom: '1px solid #30363d', flexShrink: 0 }}
          className="flex items-start justify-between"
        >
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#7c3aed]/20 text-[#7c3aed] text-xs px-2 py-0.5 rounded-full">
                by {post.authorName}
              </span>
              <span className="text-[#484f58] text-xs">
                {formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}
              </span>
            </div>
            <h2 className="text-[#e6edf3] font-semibold text-xl break-words">{post.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body + Comments — 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px' }}>
            <p
              style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
              className="text-[#8b949e] text-sm leading-relaxed"
            >
              {post.body}
            </p>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
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
          </div>

          <div style={{ borderTop: '1px solid #30363d', padding: '16px 24px 24px' }}>
            <h3 className="text-[#e6edf3] text-sm font-medium mb-3">
              댓글 {comments.length}개
            </h3>

            {isLoadingComments ? (
              <p className="text-[#484f58] text-sm text-center py-2">불러오는 중…</p>
            ) : (
              <>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-[#21262d] rounded-lg px-3 py-2 mb-2 flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#7c3aed] text-xs font-medium">
                        by {comment.authorName}
                      </span>
                      {comment.userId === currentUserId && (
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-[#da3633] text-xs hover:underline ml-auto"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p
                      style={{ wordBreak: 'break-word' }}
                      className="text-[#e6edf3] text-sm mt-1"
                    >
                      {comment.content}
                    </p>
                    <span className="text-[#484f58] text-xs mt-1">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}

                {currentUserId ? (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => onCommentInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSubmitComment()
                      }}
                      placeholder="댓글을 입력하세요..."
                      className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-3 py-2 text-sm placeholder-[#484f58] focus:outline-none focus:border-[#7c3aed]"
                    />
                    <button
                      onClick={onSubmitComment}
                      className="bg-[#7c3aed] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#6d28d9] transition-colors"
                    >
                      등록
                    </button>
                  </div>
                ) : (
                  <p className="text-[#484f58] text-sm mt-3">댓글을 달려면 로그인하세요</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [openCommentIds, setOpenCommentIds] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({})
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  useEffect(() => {
    setCurrentUserId(getCurrentUserId())
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

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

  const fetchComments = useCallback(async (noteId: string) => {
    setIsLoadingComments((prev) => ({ ...prev, [noteId]: true }))
    try {
      const res = await fetch(`/api/v1/community/${noteId}/comments`)
      const data = await res.json()
      if (data.success) {
        setComments((prev) => ({ ...prev, [noteId]: data.data.comments }))
      }
    } finally {
      setIsLoadingComments((prev) => ({ ...prev, [noteId]: false }))
    }
  }, [])

  const toggleComments = useCallback(
    (noteId: string) => {
      setOpenCommentIds((prev) => {
        const next = new Set(prev)
        if (next.has(noteId)) {
          next.delete(noteId)
        } else {
          next.add(noteId)
          if (!comments[noteId]) fetchComments(noteId)
        }
        return next
      })
    },
    [comments, fetchComments],
  )

  const openPostModal = useCallback(
    (post: Post) => {
      setSelectedPost(post)
      if (!comments[post.id]) fetchComments(post.id)
    },
    [comments, fetchComments],
  )

  const closePostModal = useCallback(() => setSelectedPost(null), [])

  const submitComment = useCallback(
    async (noteId: string) => {
      const content = (commentInput[noteId] ?? '').trim()
      if (!content) return
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/v1/community/${noteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.success) {
        setComments((prev) => ({
          ...prev,
          [noteId]: [...(prev[noteId] ?? []), data.data.comment],
        }))
        setCommentInput((prev) => ({ ...prev, [noteId]: '' }))
      }
    },
    [commentInput],
  )

  const deleteComment = useCallback(async (noteId: string, commentId: string) => {
    const token = localStorage.getItem('accessToken')
    const res = await fetch(`/api/v1/community/${noteId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.success) {
      setComments((prev) => ({
        ...prev,
        [noteId]: (prev[noteId] ?? []).filter((c) => c.id !== commentId),
      }))
    }
  }, [])

  const hasMore = posts.length < total

  return (
    <div className="max-w-2xl mx-auto">
      {selectedPost && (
        <PostModal
          post={selectedPost}
          comments={comments[selectedPost.id] ?? []}
          isLoadingComments={isLoadingComments[selectedPost.id] ?? false}
          currentUserId={currentUserId}
          commentInput={commentInput[selectedPost.id] ?? ''}
          onClose={closePostModal}
          onCommentInputChange={(value) =>
            setCommentInput((prev) => ({ ...prev, [selectedPost.id]: value }))
          }
          onSubmitComment={() => submitComment(selectedPost.id)}
          onDeleteComment={(commentId) => deleteComment(selectedPost.id, commentId)}
        />
      )}

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
        {posts.map((post) => {
          const isOpen = openCommentIds.has(post.id)
          const postComments = comments[post.id] ?? []
          const commentCount = postComments.length

          return (
            <div
              key={post.id}
              onClick={() => openPostModal(post)}
              className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#7c3aed]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#7c3aed]/20 text-[#7c3aed] text-xs px-2 py-0.5 rounded-full">
                  by {post.authorName}
                </span>
              </div>

              <h2 className="text-[#e6edf3] font-semibold text-lg mb-2">{post.title}</h2>

              <p className="text-[#8b949e] text-sm leading-relaxed mb-3 line-clamp-3">
                {post.body}
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

              <div className="flex items-center justify-between">
                <span className="text-[#484f58] text-xs">
                  {formatDistanceToNow(new Date(post.updatedAt), { addSuffix: true })}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleComments(post.id)
                  }}
                  className="text-[#8b949e] hover:text-[#7c3aed] text-sm flex items-center gap-1 transition-colors"
                >
                  💬 댓글 {isOpen ? commentCount : ''}개
                </button>
              </div>

              {isOpen && (
                <div
                  className="border-t border-[#30363d] mt-4 pt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isLoadingComments[post.id] ? (
                    <p className="text-[#484f58] text-sm text-center py-2">불러오는 중…</p>
                  ) : (
                    <>
                      {postComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-[#21262d] rounded-lg px-3 py-2 mb-2 flex flex-col"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[#7c3aed] text-xs font-medium">
                              by {comment.authorName}
                            </span>
                            {comment.userId === currentUserId && (
                              <button
                                onClick={() => deleteComment(post.id, comment.id)}
                                className="text-[#da3633] text-xs hover:underline ml-auto"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                          <p className="text-[#e6edf3] text-sm mt-1">{comment.content}</p>
                          <span className="text-[#484f58] text-xs mt-1">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      ))}

                      {currentUserId ? (
                        <div className="flex gap-2 mt-3">
                          <input
                            type="text"
                            value={commentInput[post.id] ?? ''}
                            onChange={(e) =>
                              setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitComment(post.id)
                            }}
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] rounded-lg px-3 py-2 text-sm placeholder-[#484f58] focus:outline-none focus:border-[#7c3aed]"
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            className="bg-[#7c3aed] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#6d28d9] transition-colors"
                          >
                            등록
                          </button>
                        </div>
                      ) : (
                        <p className="text-[#484f58] text-sm mt-3">
                          댓글을 달려면 로그인하세요
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
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