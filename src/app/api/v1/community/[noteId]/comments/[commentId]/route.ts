import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success } from '@/lib/api-response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string; commentId: string }> },
) {
  const { userId } = await requireAuth(request)
  const { commentId } = await params

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) {
    return Response.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  if (comment.userId !== userId) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id: commentId } })

  return success({ id: commentId })
}
