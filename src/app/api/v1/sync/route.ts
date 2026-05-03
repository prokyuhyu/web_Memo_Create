import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'
import { processDeltaSync, type SyncItem } from '@/lib/sync-engine'

const syncItemSchema = z.object({
  id: z.string().min(1),
  entityType: z.enum(['NOTE', 'SCHEDULE']),
  version: z.number().int().min(1),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(),
  data: z.record(z.unknown()),
})

const syncSchema = z.object({
  lastSyncedAt: z.string().datetime(),
  items: z.array(syncItemSchema).max(500),
})

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

  const parsed = syncSchema.safeParse(body)
  if (!parsed.success) {
    return error('Invalid input', 400)
  }

  const { lastSyncedAt, items } = parsed.data

  const result = await processDeltaSync(
    userId,
    new Date(lastSyncedAt),
    items as SyncItem[],
  )

  return success({
    applied: result.applied,
    serverUpdates: result.serverUpdates,
    conflicts: result.conflicts,
    errors: result.errors,
    syncedAt: new Date().toISOString(),
  })
}
