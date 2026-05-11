export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { success, error } from '@/lib/api-response'
import { requireRole } from '@/lib/require-role'

const PINNED_TAG = '__PINNED_NOTICE__'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

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
      tags: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, handle: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return success({ notices })
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

  let noteId: string
  try {
    const body = await request.json()
    noteId = body?.noteId
  } catch {
    return error('Invalid request body', 400)
  }

  if (!noteId) return error('noteId is required', 400)

  const note = await prisma.note.findUnique({ where: { id: noteId } })
  if (!note) return error('Note not found', 404)
  if (!note.isPublic) return error('Note must be public to pin', 400)
  if (note.deletedAt) return error('Cannot pin a deleted note', 400)

  const newTags = note.tags.includes(PINNED_TAG) ? note.tags : [...note.tags, PINNED_TAG]

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: { tags: newTags },
    select: {
      id: true,
      title: true,
      body: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, handle: true } },
    },
  })

  return success({ note: updated })
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

  let noteId: string
  try {
    const body = await request.json()
    noteId = body?.noteId
  } catch {
    return error('Invalid request body', 400)
  }

  if (!noteId) return error('noteId is required', 400)

  const note = await prisma.note.findUnique({ where: { id: noteId } })
  if (!note) return error('Note not found', 404)

  const newTags = note.tags.filter((t) => t !== PINNED_TAG)

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: { tags: newTags },
    select: {
      id: true,
      title: true,
      body: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, handle: true } },
    },
  })

  return success({ note: updated })
}
