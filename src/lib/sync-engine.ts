import { prisma } from '@/lib/prisma'
import type { Note, Schedule } from '@/app/generated/prisma/client'

export type SyncItem = {
  id: string
  entityType: 'NOTE' | 'SCHEDULE'
  version: number
  updatedAt: string
  deletedAt?: string
  data: Record<string, unknown>
}

export type ConflictItem = {
  entityType: 'NOTE' | 'SCHEDULE'
  id: string
  clientItem: SyncItem
  serverItem: SyncItem
}

export type SyncResult = {
  applied: SyncItem[]
  serverUpdates: SyncItem[]
  conflicts: ConflictItem[]
  errors: Array<{ id: string; error: string }>
}

function noteToSyncItem(note: Note): SyncItem {
  return {
    id: note.id,
    entityType: 'NOTE',
    version: note.version,
    updatedAt: note.updatedAt.toISOString(),
    ...(note.deletedAt ? { deletedAt: note.deletedAt.toISOString() } : {}),
    data: {
      title: note.title,
      body: note.body,
      tags: note.tags,
      isPublic: note.isPublic,
    },
  }
}

function scheduleToSyncItem(schedule: Schedule): SyncItem {
  return {
    id: schedule.id,
    entityType: 'SCHEDULE',
    version: schedule.version,
    updatedAt: schedule.updatedAt.toISOString(),
    ...(schedule.deletedAt ? { deletedAt: schedule.deletedAt.toISOString() } : {}),
    data: {
      title: schedule.title,
      description: schedule.description ?? null,
      startAt: schedule.startAt.toISOString(),
      endAt: schedule.endAt?.toISOString() ?? null,
      notifyAt: schedule.notifyAt?.toISOString() ?? null,
    },
  }
}

function toSyncItem(entityType: 'NOTE' | 'SCHEDULE', record: Note | Schedule): SyncItem {
  return entityType === 'NOTE'
    ? noteToSyncItem(record as Note)
    : scheduleToSyncItem(record as Schedule)
}

async function fetchRecord(
  entityType: 'NOTE' | 'SCHEDULE',
  id: string,
  userId: string,
): Promise<Note | Schedule | null> {
  // Fetch including soft-deleted records so we can detect server-side deletions
  if (entityType === 'NOTE') {
    return prisma.note.findFirst({ where: { id, userId } })
  }
  return prisma.schedule.findFirst({ where: { id, userId } })
}

async function logSync(
  userId: string,
  entityType: 'NOTE' | 'SCHEDULE',
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFLICT',
  clientVersion: number,
  serverVersion: number,
  resolvedBy: 'CLIENT' | 'SERVER' | 'PENDING' = 'PENDING',
): Promise<void> {
  await prisma.syncLog.create({
    data: {
      userId,
      entityType,
      entityId,
      action,
      clientVersion,
      serverVersion,
      resolvedBy,
    },
  })
}

async function processItem(
  userId: string,
  lastSyncedAt: Date,
  item: SyncItem,
  result: SyncResult,
): Promise<void> {
  try {
    const serverRecord = await fetchRecord(item.entityType, item.id, userId)
    const clientUpdatedAt = new Date(item.updatedAt)

    // ── New item from client ──────────────────────────────────────────────────
    if (!serverRecord) {
      // Client is deleting something that never existed on the server — skip
      if (item.deletedAt) return

      let created: Note | Schedule
      if (item.entityType === 'NOTE') {
        const d = item.data
        created = await prisma.note.create({
          data: {
            id: item.id,
            userId,
            title: d.title as string,
            body: d.body as string,
            tags: (d.tags as string[]) ?? [],
            isPublic: (d.isPublic as boolean) ?? false,
            version: item.version,
          },
        })
      } else {
        const d = item.data
        created = await prisma.schedule.create({
          data: {
            id: item.id,
            userId,
            title: d.title as string,
            description: (d.description as string) ?? null,
            startAt: new Date(d.startAt as string),
            endAt: d.endAt ? new Date(d.endAt as string) : null,
            notifyAt: d.notifyAt ? new Date(d.notifyAt as string) : null,
            version: item.version,
          },
        })
      }

      await logSync(userId, item.entityType, item.id, 'CREATE', item.version, created.version, 'CLIENT')
      result.applied.push(toSyncItem(item.entityType, created))
      return
    }

    // ── Client soft-deleted this item ─────────────────────────────────────────
    if (item.deletedAt) {
      if (!serverRecord.deletedAt) {
        let deleted: Note | Schedule
        if (item.entityType === 'NOTE') {
          deleted = await prisma.note.update({
            where: { id: item.id },
            data: { deletedAt: new Date(item.deletedAt), version: { increment: 1 } },
          })
        } else {
          deleted = await prisma.schedule.update({
            where: { id: item.id },
            data: { deletedAt: new Date(item.deletedAt), version: { increment: 1 } },
          })
        }
        await logSync(userId, item.entityType, item.id, 'DELETE', item.version, deleted.version, 'CLIENT')
        result.applied.push(toSyncItem(item.entityType, deleted))
      }
      // Already deleted on server — nothing to do
      return
    }

    const serverUpdatedAt = serverRecord.updatedAt

    // ── Both changed since last sync → CONFLICT ───────────────────────────────
    if (serverUpdatedAt > lastSyncedAt && clientUpdatedAt > lastSyncedAt) {
      await logSync(userId, item.entityType, item.id, 'CONFLICT', item.version, serverRecord.version, 'PENDING')
      result.conflicts.push({
        entityType: item.entityType,
        id: item.id,
        clientItem: item,
        serverItem: toSyncItem(item.entityType, serverRecord),
      })
      return
    }

    // ── Only server changed → server wins, inform client ─────────────────────
    if (serverUpdatedAt > lastSyncedAt) {
      result.serverUpdates.push(toSyncItem(item.entityType, serverRecord))
      return
    }

    // ── Client wins (only client changed, or neither changed) ─────────────────
    let updated: Note | Schedule
    if (item.entityType === 'NOTE') {
      const d = item.data
      updated = await prisma.note.update({
        where: { id: item.id },
        data: {
          title: d.title as string,
          body: d.body as string,
          tags: (d.tags as string[]) ?? [],
          isPublic: (d.isPublic as boolean) ?? false,
          version: { increment: 1 },
        },
      })
    } else {
      const d = item.data
      updated = await prisma.schedule.update({
        where: { id: item.id },
        data: {
          title: d.title as string,
          description: (d.description as string | null) ?? null,
          startAt: new Date(d.startAt as string),
          endAt: d.endAt ? new Date(d.endAt as string) : null,
          notifyAt: d.notifyAt ? new Date(d.notifyAt as string) : null,
          version: { increment: 1 },
        },
      })
    }

    await logSync(userId, item.entityType, item.id, 'UPDATE', item.version, updated.version, 'CLIENT')
    result.applied.push(toSyncItem(item.entityType, updated))
  } catch (e) {
    result.errors.push({
      id: item.id,
      error: e instanceof Error ? e.message : 'Unknown error',
    })
  }
}

export async function processDeltaSync(
  userId: string,
  lastSyncedAt: Date,
  items: SyncItem[],
): Promise<SyncResult> {
  const result: SyncResult = { applied: [], serverUpdates: [], conflicts: [], errors: [] }

  for (const item of items) {
    await processItem(userId, lastSyncedAt, item, result)
  }

  return result
}
