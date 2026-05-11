export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { success } from '@/lib/api-response'

const PINNED_TAG = '__PINNED_NOTICE__'

export async function GET() {
  const notices = await prisma.note.findMany({
    where: {
      isPublic: true,
      deletedAt: null,
      tags: { has: PINNED_TAG },
    },
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, handle: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = notices.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    authorName: n.user.name,
    authorHandle: n.user.handle,
  }))

  return success({ notices: result })
}
