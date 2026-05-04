import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { success } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
  const search = searchParams.get('search') ?? ''

  const where = {
    isPublic: true,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { body: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.note.count({ where }),
  ])

  const posts = notes.map((note) => ({
    id: note.id,
    title: note.title,
    body: note.body.length > 200 ? note.body.slice(0, 200) : note.body,
    tags: note.tags,
    authorName: note.user.name,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }))

  return success({ posts, total, page, limit })
}
