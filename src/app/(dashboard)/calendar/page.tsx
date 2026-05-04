'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Check, CalendarDays } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import api from '@/lib/api-client'
import { useSyncQueue } from '@/app/(dashboard)/layout'

type Schedule = {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  notifyAt: string | null
  version: number
  updatedAt: string
  createdAt: string
}

type SchedulesResponse = {
  success: boolean
  data: { schedules: Schedule[] }
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return format(d, "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ''
  }
}

function scheduleToSyncItem(s: Schedule) {
  return {
    id: s.id,
    entityType: 'SCHEDULE' as const,
    version: s.version,
    updatedAt: s.updatedAt,
    data: {
      title: s.title,
      description: s.description ?? null,
      startAt: s.startAt,
      endAt: s.endAt ?? null,
      notifyAt: s.notifyAt ?? null,
    },
  }
}

// ─── Field helpers ─────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg bg-black text-white border border-blue-400 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400'

// ─── Create form ──────────────────────────────────────────────────────────

function CreateScheduleForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const { addSyncItem } = useSyncQueue()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [notifyAt, setNotifyAt] = useState('')
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () =>
      api
        .post<{ success: boolean; data: { schedule: Schedule } }>('/schedules', {
          title,
          description: description || undefined,
          startAt: new Date(startAt).toISOString(),
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
          notifyAt: notifyAt ? new Date(notifyAt).toISOString() : undefined,
        })
        .then((r) => r.data.data.schedule),
    onSuccess: (schedule) => {
      qc.invalidateQueries({ queryKey: ['schedules'] })
      addSyncItem(scheduleToSyncItem(schedule))
      onDone()
    },
    onError: () => setError('Failed to create schedule.'),
  })

  return (
    <div className="bg-[#162d4a] rounded-xl border border-blue-800 p-5 space-y-3 shadow-sm">
      <h3 className="font-semibold text-white text-sm">New schedule</h3>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <FieldGroup label="Title *">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className={inputCls} />
      </FieldGroup>
      <FieldGroup label="Description">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className={inputCls} />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Start *">
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
        </FieldGroup>
        <FieldGroup label="End">
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
        </FieldGroup>
      </div>
      <FieldGroup label="Notify at">
        <input type="datetime-local" value={notifyAt} onChange={(e) => setNotifyAt(e.target.value)} className={inputCls} />
      </FieldGroup>
      <div className="flex gap-2 pt-1">
        <div
          onClick={() => { if (!title || !startAt) { setError('Title and start date are required.'); return } create.mutate() }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium px-4 py-2 cursor-pointer hover:bg-blue-600 transition-colors select-none"
          style={{ opacity: create.isPending ? 0.7 : 1, pointerEvents: create.isPending ? 'none' : 'auto' }}
        >
          <Check size={13} />
          {create.isPending ? 'Saving…' : 'Save'}
        </div>
        <div
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-lg border border-blue-600 text-gray-300 text-xs font-medium px-4 py-2 cursor-pointer hover:bg-blue-900/40 transition-colors select-none"
        >
          <X size={13} />
          Cancel
        </div>
      </div>
    </div>
  )
}

// ─── Schedule card ────────────────────────────────────────────────────────

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const qc = useQueryClient()
  const { addSyncItem } = useSyncQueue()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(schedule.title)
  const [description, setDescription] = useState(schedule.description ?? '')
  const [startAt, setStartAt] = useState(toLocalInput(schedule.startAt))
  const [endAt, setEndAt] = useState(toLocalInput(schedule.endAt))
  const [notifyAt, setNotifyAt] = useState(toLocalInput(schedule.notifyAt))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const update = useMutation({
    mutationFn: () =>
      api
        .patch<{ success: boolean; data: { schedule: Schedule } }>(`/schedules/${schedule.id}`, {
          clientVersion: schedule.version,
          title,
          description: description || undefined,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
          notifyAt: notifyAt ? new Date(notifyAt).toISOString() : undefined,
        })
        .then((r) => r.data.data.schedule),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['schedules'] })
      addSyncItem(scheduleToSyncItem(updated))
      setEditing(false)
    },
    onError: () => setError('Save failed — schedule may have been updated elsewhere.'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/schedules/${schedule.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
    onError: () => setError('Delete failed.'),
  })

  if (editing) {
    return (
      <div className="bg-[#162d4a] rounded-xl border border-blue-800 p-5 space-y-3 shadow-sm">
        {error && <p className="text-xs text-red-400">{error}</p>}
        <FieldGroup label="Title *">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </FieldGroup>
        <FieldGroup label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Start *">
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
          </FieldGroup>
          <FieldGroup label="End">
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
          </FieldGroup>
        </div>
        <FieldGroup label="Notify at">
          <input type="datetime-local" value={notifyAt} onChange={(e) => setNotifyAt(e.target.value)} className={inputCls} />
        </FieldGroup>
        <div className="flex gap-2">
          <div
            onClick={() => !update.isPending && update.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium px-4 py-2 cursor-pointer hover:bg-blue-600 transition-colors select-none"
            style={{ opacity: update.isPending ? 0.7 : 1, pointerEvents: update.isPending ? 'none' : 'auto' }}
          >
            <Check size={13} />
            {update.isPending ? 'Saving…' : 'Save'}
          </div>
          <div
            onClick={() => { setEditing(false); setError('') }}
            className="flex items-center gap-1.5 rounded-lg border border-blue-600 text-gray-300 text-xs font-medium px-4 py-2 cursor-pointer hover:bg-blue-900/40 transition-colors select-none"
          >
            <X size={13} />
            Cancel
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#162d4a] rounded-xl border border-blue-800 p-5 space-y-2 hover:border-blue-600 transition-colors">
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{schedule.title}</h3>
          {schedule.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{schedule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-900/40 cursor-pointer transition-colors"
          >
            <Pencil size={14} />
          </div>
          <div
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/40 cursor-pointer transition-colors"
          >
            <Trash2 size={14} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>
          <span className="font-medium text-gray-300">Start: </span>
          {fmt(schedule.startAt)}
        </span>
        {schedule.endAt && (
          <span>
            <span className="font-medium text-gray-300">End: </span>
            {fmt(schedule.endAt)}
          </span>
        )}
        {schedule.notifyAt && (
          <span>
            <span className="font-medium text-gray-300">Notify: </span>
            {fmt(schedule.notifyAt)}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-500">
        Updated {formatDistanceToNow(new Date(schedule.updatedAt), { addSuffix: true })}
      </div>

      {confirmDelete && (
        <div className="rounded-lg bg-red-900/30 border border-red-700 p-3 flex items-center justify-between gap-3">
          <span className="text-xs text-red-300">Delete this schedule?</span>
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
              className="text-xs font-medium text-gray-300 border border-blue-600 rounded-lg px-3 py-1 cursor-pointer hover:bg-blue-900/40 transition-colors select-none"
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

export default function CalendarPage() {
  const [creating, setCreating] = useState(false)

  const { data, isLoading, isError } = useQuery<SchedulesResponse>({
    queryKey: ['schedules'],
    queryFn: () => api.get('/schedules').then((r) => r.data),
  })

  const schedules = data?.data?.schedules ?? []

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={22} className="text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
        </div>
        {!creating && (
          <div
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-500 text-white text-sm font-medium px-4 py-2 cursor-pointer hover:bg-blue-600 transition-colors select-none"
          >
            <Plus size={16} />
            New schedule
          </div>
        )}
      </div>

      {creating && <CreateScheduleForm onDone={() => setCreating(false)} />}

      {isLoading && (
        <div className="text-center py-16 text-sm text-gray-400">Loading schedules…</div>
      )}
      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          Failed to load schedules.
        </div>
      )}

      {!isLoading && !isError && schedules.length === 0 && !creating && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No schedules yet. Add your first event!</p>
        </div>
      )}

      <div className="space-y-4">
        {schedules.map((s) => (
          <ScheduleCard key={s.id} schedule={s} />
        ))}
      </div>
    </div>
  )
}
