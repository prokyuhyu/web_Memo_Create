import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'
import { checkVersion } from '@/lib/version-check'

const isoDate = z.string().refine(
  (v) => !isNaN(new Date(v).getTime()),
  { message: 'Invalid ISO date string' }
)

const patchSchema = z.object({
  clientVersion: z.number().int(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startAt: isoDate.optional(),
  endAt: isoDate.optional(),
  notifyAt: isoDate.optional(),
})

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

  const schedule = await prisma.schedule.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!schedule) return error('Schedule not found', 404)

  return success({ schedule })
}

export async function PATCH(
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
  const { clientVersion, title, description, startAt, endAt, notifyAt } = result.data

  const serverRecord = await prisma.schedule.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!serverRecord) return error('Schedule not found', 404)

  const conflict = checkVersion(serverRecord, clientVersion)
  if (conflict) return conflict

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(startAt !== undefined ? { startAt: new Date(startAt) } : {}),
      ...(endAt !== undefined ? { endAt: new Date(endAt) } : {}),
      ...(notifyAt !== undefined ? { notifyAt: new Date(notifyAt) } : {}),
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  })

  return success({ schedule: updated })
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

  const schedule = await prisma.schedule.findFirst({
    where: { id, userId, deletedAt: null },
  })

  if (!schedule) return error('Schedule not found', 404)

  await prisma.schedule.update({
    where: { id },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  })

  return success({ id })
}
