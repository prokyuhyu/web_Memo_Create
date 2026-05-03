'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Check, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api-client'
import { useSyncQueue } from '@/app/(dashboard)/layout'

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
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-3 shadow-sm">
      <h3 className="font-semibold text-gray-900 text-sm">New note</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your note…"
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
      />
      <div className="flex gap-2 items-center">
        <Tag size={14} className="text-gray-400 shrink-0" />
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="Tags (comma-separated)"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
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
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium px-4 py-2 cursor-pointer hover:bg-blue-700 transition-colors select-none"
          style={{ opacity: create.isPending ? 0.7 : 1, pointerEvents: create.isPending ? 'none' : 'auto' }}
        >
          <Check size={13} />
          {create.isPending ? 'Saving…' : 'Save'}
        </div>
        <div
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors select-none"
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
      <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-3 shadow-sm">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
        />
        <div className="flex gap-2 items-center">
          <Tag size={14} className="text-gray-400 shrink-0" />
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
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
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium px-4 py-2 cursor-pointer hover:bg-blue-700 transition-colors select-none"
            style={{ opacity: update.isPending ? 0.7 : 1, pointerEvents: update.isPending ? 'none' : 'auto' }}
          >
            <Check size={13} />
            {update.isPending ? 'Saving…' : 'Save'}
          </div>
          <div
            onClick={() => { setEditing(false); setError('') }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors select-none"
          >
            <X size={13} />
            Cancel
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 hover:border-gray-300 transition-colors">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors flex-1 min-w-0"
          onClick={() => setEditing(true)}
        >
          {note.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <div
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <Pencil size={14} />
          </div>
          <div
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <Trash2 size={14} />
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{note.body}</p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </span>
        {note.isPublic && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            Public
          </span>
        )}
      </div>

      {confirmDelete && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center justify-between gap-3">
          <span className="text-xs text-red-700">Delete this note?</span>
          <div className="flex gap-2">
            <div
              onClick={() => !remove.isPending && remove.mutate()}
              className="text-xs font-medium text-white bg-red-600 rounded-lg px-3 py-1 cursor-pointer hover:bg-red-700 transition-colors select-none"
              style={{ opacity: remove.isPending ? 0.7 : 1, pointerEvents: remove.isPending ? 'none' : 'auto' }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </div>
            <div
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors select-none"
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
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        {!creating && (
          <div
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 cursor-pointer hover:bg-blue-700 transition-colors select-none"
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
        <div className="text-center py-16 text-sm text-gray-400">Loading notes…</div>
      )}
      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          Failed to load notes.
        </div>
      )}

      {/* Note list */}
      {!isLoading && !isError && notes.length === 0 && !creating && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No notes yet. Create your first one!</p>
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
