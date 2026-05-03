import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'

const resolveSchema = z.discriminatedUnion('resolution', [
  z.object({
    entityType: z.enum(['NOTE', 'SCHEDULE']),
    entityId: z.string().min(1),
    resolution: z.literal('CLIENT'),
    clientData: z.record(z.string(), z.unknown()),
  }),
  z.object({
    entityType: z.enum(['NOTE', 'SCHEDULE']),
    entityId: z.string().min(1),
    resolution: z.literal('SERVER'),
    clientData: z.record(z.string(), z.unknown()).optional(),
  }),
])

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

  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) {
    return error('Invalid input', 400)
  }

  const { entityType, entityId, resolution } = parsed.data

  // Find the pending conflict log entry for this entity
  const conflictLog = await prisma.syncLog.findFirst({
    where: { userId, entityType, entityId, action: 'CONFLICT', resolvedBy: 'PENDING' },
    orderBy: { syncedAt: 'desc' },
  })

  if (!conflictLog) {
    return error('No pending conflict found for this entity', 404)
  }

  let updatedRecord: unknown

  if (resolution === 'CLIENT') {
    const clientData = parsed.data.clientData

    if (entityType === 'NOTE') {
      const existing = await prisma.note.findFirst({ where: { id: entityId, userId } })
      if (!existing) return error('Record not found', 404)

      updatedRecord = await prisma.note.update({
        where: { id: entityId },
        data: {
          title: clientData.title as string,
          body: clientData.body as string,
          tags: (clientData.tags as string[]) ?? [],
          isPublic: (clientData.isPublic as boolean) ?? false,
          version: { increment: 1 },
        },
      })
    } else {
      const existing = await prisma.schedule.findFirst({ where: { id: entityId, userId } })
      if (!existing) return error('Record not found', 404)

      updatedRecord = await prisma.schedule.update({
        where: { id: entityId },
        data: {
          title: clientData.title as string,
          description: (clientData.description as string | null) ?? null,
          startAt: new Date(clientData.startAt as string),
          endAt: clientData.endAt ? new Date(clientData.endAt as string) : null,
          notifyAt: clientData.notifyAt ? new Date(clientData.notifyAt as string) : null,
          version: { increment: 1 },
        },
      })
    }
  } else {
    // SERVER resolution — server record is already correct, just fetch it
    if (entityType === 'NOTE') {
      updatedRecord = await prisma.note.findFirst({ where: { id: entityId, userId } })
    } else {
      updatedRecord = await prisma.schedule.findFirst({ where: { id: entityId, userId } })
    }
    if (!updatedRecord) return error('Record not found', 404)
  }

  // Mark the conflict log as resolved
  await prisma.syncLog.update({
    where: { id: conflictLog.id },
    data: { resolvedBy: resolution },
  })

  return success({ resolution, record: updatedRecord })
}
