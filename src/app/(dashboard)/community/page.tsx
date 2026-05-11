'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { formatDistanceToNow } from 'date-fns'
import { Tag, X, MoreVertical } from 'lucide-react'

const PINNED_TAG = '__PINNED_NOTICE__'

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

function getTokenRole(): string | null {
  try {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    const decoded = JSON.parse(atob(token.split('.')[1]))
    return decoded.role ?? null
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

  const visibleTags = post.tags.filter((t) => t !== PINNED_TAG)

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        padding: '16px',
        overflow: 'hidden',
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
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div>
          <div style={{ padding: '24px' }}>
            <p
              style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
              className="text-[#8b949e] text-sm leading-relaxed"
            >
              {post.body}
            </p>

            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {visibleTags.map((tag) => (
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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [openCommentIds, setOpenCommentIds] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({})
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const [pinnedNotices, setPinnedNotices] = useState<Post[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setCurrentUserId(getCurrentUserId())
    setUserRole(getTokenRole())
  }, [])

  const fetchPinnedNotices = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notices/pinned')
      const data = await res.json()
      if (data.success) setPinnedNotices(data.data.notices)
    } catch {
      // non-critical; silently ignore
    }
  }, [])

  useEffect(() => {
    fetchPinnedNotices()
  }, [fetchPinnedNotices])

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

  const handlePinToggle = useCallback(
    async (post: Post) => {
      setOpenMenuId(null)
      const token = localStorage.getItem('accessToken')
      const isPinned = post.tags.includes(PINNED_TAG)
      try {
        const res = await fetch('/api/v1/admin/notices', {
          method: isPinned ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ noteId: post.id }),
        })
        const data = await res.json().catch(() => ({ success: false }))
        if (data.success) {
          if (isPinned) {
            setPinnedNotices((prev) => prev.filter((n) => n.id !== post.id))
          } else {
            setPinnedNotices((prev) => {
              if (prev.some((n) => n.id === post.id)) return prev
              return [{ ...post, tags: [...post.tags, PINNED_TAG] }, ...prev]
            })
          }
          setPosts((prev) =>
            prev.map((p) =>
              p.id !== post.id
                ? p
                : {
                    ...p,
                    tags: isPinned
                      ? p.tags.filter((t) => t !== PINNED_TAG)
                      : [...p.tags, PINNED_TAG],
                  },
            ),
          )
          fetchPinnedNotices()
          setActionMsg({ type: 'success', text: isPinned ? '공지가 해제되었습니다.' : '공지로 고정되었습니다.' })
          setTimeout(() => setActionMsg(null), 3000)
        } else {
          setActionMsg({ type: 'error', text: '작업에 실패했습니다.' })
          setTimeout(() => setActionMsg(null), 3000)
        }
      } catch {
        setActionMsg({ type: 'error', text: '네트워크 오류가 발생했습니다.' })
        setTimeout(() => setActionMsg(null), 3000)
      }
    },
    [fetchPinnedNotices],
  )

  const handleDelete = useCallback((_post: Post) => {
    setOpenMenuId(null)
    // TODO: ROOT-level deletion requires a dedicated admin API (e.g. DELETE /api/v1/admin/notes/[id]).
    // The existing DELETE /api/v1/notes/[id] only allows the note owner to delete their own note.
    setActionMsg({ type: 'error', text: '삭제 기능은 아직 준비 중입니다.' })
    setTimeout(() => setActionMsg(null), 3000)
  }, [])

  const hasMore = posts.length < total

  const pinnedIds = new Set(pinnedNotices.map((n) => n.id))
  const regularPosts = posts.filter((p) => !pinnedIds.has(p.id))
  const sortedPinnedNotices = [...pinnedNotices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

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

      {/* Pinned notices */}
      {pinnedNotices.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[#e6edf3] text-sm font-semibold mb-3 flex items-center gap-1.5">
            <span>📌</span>
            <span>공지사항</span>
          </h2>
          <div className="space-y-2">
            {sortedPinnedNotices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => openPostModal(notice)}
                className="bg-[#161b22] border border-[#7c3aed]/30 rounded-xl px-5 py-3 hover:border-[#7c3aed]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#7c3aed] text-xs font-medium">{notice.title}</span>
                </div>
                <p className="text-[#8b949e] text-xs line-clamp-2">{notice.body}</p>
                <span className="text-[#484f58] text-xs mt-1 block">
                  by {notice.authorName} ·{' '}
                  {formatDistanceToNow(new Date(notice.updatedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {actionMsg && (
        <div
          className={`rounded-xl px-5 py-3 text-sm mb-4 ${
            actionMsg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-[#da3633]/10 border border-[#da3633]/30 text-[#da3633]'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-sm text-[#8b949e]">불러오는 중…</div>
      )}

      {!loading && posts.length === 0 && (
        <p className="text-[#8b949e] text-center py-12">아직 공개된 노트가 없습니다</p>
      )}

      <div className="space-y-4">
        {regularPosts.map((post) => {
          const isOpen = openCommentIds.has(post.id)
          const postComments = comments[post.id] ?? []
          const commentCount = postComments.length
          const isPinned = post.tags.includes(PINNED_TAG)
          const visibleTags = post.tags.filter((t) => t !== PINNED_TAG)

          return (
            <div
              key={post.id}
              onClick={() => openPostModal(post)}
              className={`bg-[#161b22] border rounded-xl p-5 hover:border-[#7c3aed]/50 transition-colors cursor-pointer ${
                isPinned ? 'border-[#7c3aed]/30' : 'border-[#30363d]'
              }`}
            >
              {/* Card header: author + ROOT menu */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isPinned && (
                    <span className="text-[#7c3aed] text-xs" title="공지 고정됨">
                      📌
                    </span>
                  )}
                  <span className="bg-[#7c3aed]/20 text-[#7c3aed] text-xs px-2 py-0.5 rounded-full">
                    by {post.authorName}
                  </span>
                </div>

                {userRole === 'ROOT' && (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      className="text-[#484f58] hover:text-[#8b949e] p-1 rounded transition-colors"
                      aria-label="게시글 관리"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {openMenuId === post.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 py-1 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-xl min-w-[120px]">
                          <button
                            onClick={() => handlePinToggle(post)}
                            className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#30363d] text-[#e6edf3] transition-colors"
                          >
                            {isPinned ? '공지 해제' : '공지 고정'}
                          </button>
                          <div className="border-t border-[#30363d] my-1" />
                          <button
                            onClick={() => handleDelete(post)}
                            className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#30363d] text-[#da3633] transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <h2 className="text-[#e6edf3] font-semibold text-lg mb-2">{post.title}</h2>

              <p className="text-[#8b949e] text-sm leading-relaxed mb-3 line-clamp-3">
                {post.body}
              </p>

              {visibleTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {visibleTags.map((tag) => (
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
