import { format } from 'date-fns'
import { Tag } from 'lucide-react'
import Link from 'next/link'

type Note = {
  id: string
  title: string
  body: string
  tags: string[]
  isPublic: boolean
  createdAt: string
  user: { name: string }
}

async function fetchNote(id: string): Promise<Note | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/v1/notes/${id}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const json = await res.json()
    const note: Note = json?.data?.note
    if (!note || !note.isPublic) return null
    return note
  } catch {
    return null
  }
}

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const note = await fetchNote(id)

  if (!note) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-[#e6edf3]">페이지를 찾을 수 없습니다</p>
          <p className="text-sm text-[#8b949e]">노트가 존재하지 않거나 비공개 상태입니다.</p>
          <Link href="/" className="text-[#7c3aed] text-sm hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#e6edf3] mb-2">{note.title}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[#8b949e] text-sm">by {note.user.name}</span>
          <span className="text-[#484f58] text-sm">
            {format(new Date(note.createdAt), 'yyyy년 M월 d일')}
          </span>
        </div>

        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
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

        <div className="border-t border-[#30363d] my-6" />

        <p className="text-[#e6edf3] leading-relaxed whitespace-pre-wrap">{note.body}</p>

        <p className="text-[#484f58] text-xs text-center mt-12">
          <Link href="/" className="text-[#7c3aed] hover:underline">
            MadeAlone
          </Link>
          으로 작성됨
        </p>
      </div>
    </main>
  )
}
