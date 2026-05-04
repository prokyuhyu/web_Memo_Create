'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Check, Tag, Link } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api-client'
import { useSyncQueue } from '@/app/(dashboard)/layout'
import Toast from '@/components/Toast'

type Note = {
  id: string
  title: string
  body: string
  tags: string[]
  isPublic: boolean
  version: number
  updatedAt: string
  createdAt: string
}

type NotesResponse = {
  success: boolean
  data: { notes: Note[]; total: number; page: number; limit: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function noteToSyncItem(note: Note) {
  return {
    id: note.id,
    entityType: 'NOTE' as const,
    version: note.version,
    updatedAt: note.updatedAt,
    data: { title: note.title, body: note.body, tags: note.tags, isPublic: note.isPublic },
  }
}

const inputCls =
  'w-full bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder-[#484f58]'

// ─── Create form ──────────────────────────────────────────────────────────

function CreateNoteForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const { addSyncItem } = useSyncQueue()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () =>
      api
        .post<{ success: boolean; data: { note: Note } }>('/notes', {
          title,
          body,
          tags: parseTags(tagsRaw),
          isPublic,
        })
        .then((r) => r.data.data.note),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      addSyncItem(noteToSyncItem(note))
      onDone()
    },
    onError: () => setError('Failed to create note.'),
  })

  return (
    <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-3 shadow-sm">
      <h3 className="font-semibold text-[#e6edf3] text-sm">New note</h3>
      {error && <p className="text-xs text-[#da3633]">{error}</p>}
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={inputCls}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your note…"
        rows={4}
        className={`${inputCls} resize-none`}
      />
      <div className="flex gap-2 items-center">
        <Tag size={14} className="text-[#8b949e] shrink-0" />
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="Tags (comma-separated)"
          className={inputCls}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#8b949e] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded"
        />
        Make public
      </label>
      <div className="flex gap-2 pt-1">
        <div
          onClick={() => !create.isPending && create.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2 cursor-pointer transition-colors select-none"
          style={{ opacity: create.isPending ? 0.7 : 1, pointerEvents: create.isPending ? 'none' : 'auto' }}
        >
          <Check size={13} />
          {create.isPending ? 'Saving…' : 'Save'}
        </div>
        <div
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-lg border border-[#30363d] text-[#8b949e] text-xs font-medium px-4 py-2 cursor-pointer hover:bg-[#21262d] transition-colors select-none"
        >
          <X size={13} />
          Cancel
        </div>
      </div>
    </div>
  )
}

// ─── Note card ────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: Note }) {
  const qc = useQueryClient()
  const { addSyncItem } = useSyncQueue()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [tagsRaw, setTagsRaw] = useState(note.tags.join(', '))
  const [isPublic, setIsPublic] = useState(note.isPublic)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleCopyLink = useCallback(() => {
    const shareUrl = `${window.location.origin}/notes/${note.id}`
    navigator.clipboard.writeText(shareUrl)
    setToast({ message: '링크가 복사됐습니다', type: 'success' })
  }, [note.id])

  const update = useMutation({
    mutationFn: () =>
      api
        .patch<{ success: boolean; data: { note: Note } }>(`/notes/${note.id}`, {
          clientVersion: note.version,
          title,
          body,
          tags: parseTags(tagsRaw),
          isPublic,
        })
        .then((r) => r.data.data.note),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      addSyncItem(noteToSyncItem(updated))
      setEditing(false)
    },
    onError: () => setError('Save failed — note may have been updated elsewhere.'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/notes/${note.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
    onError: () => setError('Delete failed.'),
  })

  if (editing) {
    return (
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-3 shadow-sm">
        {error && <p className="text-xs text-[#da3633]">{error}</p>}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className={`${inputCls} resize-none`}
        />
        <div className="flex gap-2 items-center">
          <Tag size={14} className="text-[#8b949e] shrink-0" />
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="Tags (comma-separated)"
            className={inputCls}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#8b949e] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded"
          />
          Make public
        </label>
        <div className="flex gap-2">
          <div
            onClick={() => !update.isPending && update.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-4 py-2 cursor-pointer transition-colors select-none"
            style={{ opacity: update.isPending ? 0.7 : 1, pointerEvents: update.isPending ? 'none' : 'auto' }}
          >
            <Check size={13} />
            {update.isPending ? 'Saving…' : 'Save'}
          </div>
          <div
            onClick={() => { setEditing(false); setError('') }}
            className="flex items-center gap-1.5 rounded-lg border border-[#30363d] text-[#8b949e] text-xs font-medium px-4 py-2 cursor-pointer hover:bg-[#21262d] transition-colors select-none"
          >
            <X size={13} />
            Cancel
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#7c3aed]/50 transition-colors space-y-3">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {error && <p className="text-xs text-[#da3633]">{error}</p>}

      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-semibold text-[#e6edf3] cursor-pointer hover:text-[#7c3aed] transition-colors flex-1 min-w-0"
          onClick={() => setEditing(true)}
        >
          {note.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <div
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] cursor-pointer transition-colors"
          >
            <Pencil size={14} />
          </div>
          <div
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#da3633] hover:bg-[#da3633]/10 cursor-pointer transition-colors"
          >
            <Trash2 size={14} />
          </div>
        </div>
      </div>

      <p className="text-sm text-[#8b949e] line-clamp-3 whitespace-pre-wrap">{note.body}</p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs bg-[#7c3aed]/20 text-[#7c3aed] rounded-full px-2 py-0.5"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#484f58]">
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </span>
        <div className="flex items-center gap-2">
          {note.isPublic && (
            <span className="text-xs bg-[#238636]/20 text-[#238636] rounded-full px-2 py-0.5">
              Public
            </span>
          )}
          {note.isPublic && (
            <button
              onClick={handleCopyLink}
              className="text-[#8b949e] hover:text-[#7c3aed] text-xs flex items-center gap-1 transition-colors"
            >
              <Link size={12} />
              링크 복사
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="rounded-lg bg-[#da3633]/10 border border-[#da3633]/30 p-3 flex items-center justify-between gap-3">
          <span className="text-xs text-[#da3633]">Delete this note?</span>
          <div className="flex gap-2">
            <div
              onClick={() => !remove.isPending && remove.mutate()}
              className="text-xs font-medium text-white bg-[#da3633] hover:bg-[#b91c1c] rounded-lg px-3 py-1 cursor-pointer transition-colors select-none"
              style={{ opacity: remove.isPending ? 0.7 : 1, pointerEvents: remove.isPending ? 'none' : 'auto' }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </div>
            <div
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-medium text-[#8b949e] border border-[#30363d] rounded-lg px-3 py-1 cursor-pointer hover:bg-[#21262d] transition-colors select-none"
            >
              Cancel
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [creating, setCreating] = useState(false)

  const { data, isLoading, isError } = useQuery<NotesResponse>({
    queryKey: ['notes'],
    queryFn: () => api.get('/notes').then((r) => r.data),
  })

  const notes = data?.data?.notes ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e6edf3]">Notes</h1>
        {!creating && (
          <div
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium px-4 py-2 cursor-pointer transition-colors select-none"
          >
            <Plus size={16} />
            New note
          </div>
        )}
      </div>

      {/* Create form */}
      {creating && <CreateNoteForm onDone={() => setCreating(false)} />}

      {/* States */}
      {isLoading && (
        <div className="text-center py-16 text-sm text-[#8b949e]">Loading notes…</div>
      )}
      {isError && (
        <div className="rounded-xl bg-[#da3633]/10 border border-[#da3633]/30 px-5 py-4 text-sm text-[#da3633]">
          Failed to load notes.
        </div>
      )}

      {/* Note list */}
      {!isLoading && !isError && notes.length === 0 && !creating && (
        <div className="text-center py-16">
          <p className="text-[#8b949e] text-sm">No notes yet. Create your first one!</p>
        </div>
      )}
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  )
}
