import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
  const search = searchParams.get('search') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const isPublicParam = searchParams.get('isPublic')

  const isPublicFilter =
    isPublicParam === 'true' ? true : isPublicParam === 'false' ? false : null

  const where = {
    userId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { body: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(isPublicFilter !== null ? { isPublic: isPublicFilter } : {}),
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.note.count({ where }),
  ])

  return success({ notes, total, page, limit })
}

export async function POST(request: NextRequest) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const result = createSchema.safeParse(body)
  if (!result.success) {
    return error('Invalid input', 400)
  }

  const { title, body: noteBody, tags, isPublic } = result.data

  const note = await prisma.note.create({
    data: {
      userId,
      title,
      body: noteBody,
      tags: tags ?? [],
      isPublic,
      version: 1,
    },
  })

  return success({ note }, 201)
}
