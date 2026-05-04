import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success } from '@/lib/api-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: { noteId: string } },
) {
  const { noteId } = params

  const comments = await prisma.comment.findMany({
    where: { noteId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { name: true } } },
  })

  return success({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      authorName: c.user.name,
      userId: c.userId,
      createdAt: c.createdAt,
    })),
  })
}

const commentSchema = z.object({
  content: z.string().min(1).max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { noteId: string } },
) {
  const { userId } = await requireAuth(request)
  const { noteId } = params

  const body = await request.json()
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Invalid input' }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: { noteId, userId, content: parsed.data.content },
    include: { user: { select: { name: true } } },
  })

  return success({
    comment: {
      id: comment.id,
      content: comment.content,
      authorName: comment.user.name,
      userId: comment.userId,
      createdAt: comment.createdAt,
    },
  })
}
