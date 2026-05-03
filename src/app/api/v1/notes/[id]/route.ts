import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'
import { checkVersion } from '@/lib/version-check'

const patchSchema = z.object({
  clientVersion: z.number().int(),
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const note = await prisma.note.findFirst({
    where: { id, deletedAt: null },
  })

  if (!note) return error('Note not found', 404)

  if (!note.isPublic) {
    let userId: string
    try {
      const auth = await requireAuth(request)
      userId = auth.userId
    } catch (e) {
      if (e instanceof Response) return e
      return error('Internal server error', 500)
    }
    if (note.userId !== userId) return error('Note not found', 404)
  }

  return success({ note })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return error('Invalid input', 400)
  }

  const { id } = await params
  const { clientVersion, title, body: noteBody, tags, isPublic } = result.data

  const serverRecord = await prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!serverRecord) return error('Note not found', 404)

  const conflict = checkVersion(serverRecord, clientVersion)
  if (conflict) return conflict

  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(noteBody !== undefined ? { body: noteBody } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(isPublic !== undefined ? { isPublic } : {}),
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  })

  return success({ note: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const note = await prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!note) return error('Note not found', 404)

  await prisma.note.update({
    where: { id },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  })

  return success({ id })
}
