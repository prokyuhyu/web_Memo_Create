import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'
import { storage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const { id } = await params

  const file = await prisma.file.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!file) return error('File not found', 404)

  const stream = storage.getReadStream(file.path)

  return new Response(stream, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const { id } = await params

  const file = await prisma.file.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!file) return error('File not found', 404)

  await prisma.file.update({
    where: { id },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  })

  return success({ id })
}
