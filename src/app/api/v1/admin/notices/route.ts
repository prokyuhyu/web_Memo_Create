export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { success, error } from '@/lib/api-response'

const PINNED_TAG = '__PINNED_NOTICE__'

const bodySchema = z.object({ noteId: z.string() })

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const result = bodySchema.safeParse(body)
  if (!result.success) return error('Invalid input', 400)

  const { noteId } = result.data

  const note = await prisma.note.findFirst({
    where: { id: noteId, deletedAt: null, isPublic: true },
  })

  if (!note) return error('Note not found', 404)

  if (note.tags.includes(PINNED_TAG)) {
    return success({ noteId, pinned: true })
  }

  await prisma.note.update({
    where: { id: noteId },
    data: { tags: [...note.tags, PINNED_TAG] },
  })

  return success({ noteId, pinned: true })
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const result = bodySchema.safeParse(body)
  if (!result.success) return error('Invalid input', 400)

  const { noteId } = result.data

  const note = await prisma.note.findFirst({
    where: { id: noteId, deletedAt: null },
  })

  if (!note) return error('Note not found', 404)

  if (!note.tags.includes(PINNED_TAG)) {
    return success({ noteId, pinned: false })
  }

  await prisma.note.update({
    where: { id: noteId },
    data: { tags: note.tags.filter((t) => t !== PINNED_TAG) },
  })

  return success({ noteId, pinned: false })
}
