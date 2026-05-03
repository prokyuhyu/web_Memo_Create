'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, Trash2, FileIcon, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import api from '@/lib/api-client'

type FileRecord = {
  id: string
  originalName: string
  size: number
  mimeType: string
  createdAt: string
}

type FilesResponse = {
  success: boolean
  data: { files: FileRecord[]; total: number }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Upload zone ──────────────────────────────────────────────────────────

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onUploaded()
    } catch {
      setError(`Failed to upload "${file.name}". Check file size (max 50 MB).`)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 cursor-pointer transition-colors select-none ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : uploading
            ? 'border-gray-200 bg-gray-50 cursor-default'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          {uploading ? (
            <Upload size={20} className="text-blue-500 animate-bounce" />
          ) : (
            <FolderOpen size={20} className="text-blue-500" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Drag & drop a file here'}
          </p>
          {!uploading && (
            <p className="text-xs text-gray-400 mt-0.5">or click to browse — max 50 MB</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

// ─── File row ─────────────────────────────────────────────────────────────

function FileRow({ file }: { file: FileRecord }) {
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const remove = useMutation({
    mutationFn: () => api.delete(`/files/${file.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
    onError: () => setError('Delete failed.'),
  })

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      const res = await api.get(`/files/${file.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.originalName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Download failed.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <FileIcon size={16} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.originalName}</p>
          <p className="text-xs text-gray-400">
            {formatSize(file.size)} · {format(new Date(file.createdAt), 'yyyy-MM-dd HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
            style={{ opacity: downloading ? 0.5 : 1, pointerEvents: downloading ? 'none' : 'auto' }}
            title="Download"
          >
            <Download size={15} />
          </div>
          <div
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 pl-12">{error}</p>}

      {confirmDelete && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center justify-between gap-3 ml-12">
          <span className="text-xs text-red-700">Delete this file?</span>
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

export default function FilesPage() {
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery<FilesResponse>({
    queryKey: ['files'],
    queryFn: () => api.get('/files').then((r) => r.data),
  })

  const files = data?.data?.files ?? []

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Upload size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Files</h1>
        {data?.data?.total !== undefined && (
          <span className="ml-auto text-sm text-gray-400">{data.data.total} file{data.data.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      <UploadZone onUploaded={() => qc.invalidateQueries({ queryKey: ['files'] })} />

      {isLoading && (
        <div className="text-center py-10 text-sm text-gray-400">Loading files…</div>
      )}
      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          Failed to load files.
        </div>
      )}

      {!isLoading && !isError && files.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm">No files uploaded yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {files.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </div>
  )
}
