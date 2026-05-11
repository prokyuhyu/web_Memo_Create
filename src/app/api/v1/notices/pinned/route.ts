export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { success } from '@/lib/api-response'

const PINNED_TAG = '__PINNED_NOTICE__'

export async function GET() {
  const notes = await prisma.note.findMany({
    where: {
      tags: { has: PINNED_TAG },
      isPublic: true,
      deletedAt: null,
    },
    orderBy: { updatedAt: 'desc' },
    include: { user: { select: { name: true } } },
  })

  const notices = notes.map((note) => ({
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    authorName: note.user.name,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }))

  return success({ notices })
}
