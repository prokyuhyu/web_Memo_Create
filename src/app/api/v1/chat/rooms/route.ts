import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'

const createRoomSchema = z.object({
  targetUserId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const participants = await prisma.chatRoomParticipant.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { room: { updatedAt: 'desc' } },
  })

  const rooms = participants.map((p) => {
    const other = p.room.participants.find((pt) => pt.userId !== userId)
    const lastMessage = p.room.messages[0] ?? null
    return {
      id: p.room.id,
      otherUser: other ? { id: other.userId, name: other.user.name } : null,
      lastMessage: lastMessage
        ? { content: lastMessage.content, createdAt: lastMessage.createdAt }
        : null,
      updatedAt: p.room.updatedAt,
    }
  })

  return success({ rooms })
}

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

  const result = createRoomSchema.safeParse(body)
  if (!result.success) return error('Invalid input', 400)

  const { targetUserId } = result.data

  // Check existing room between these two users
  const existing = await prisma.chatRoomParticipant.findFirst({
    where: {
      userId,
      room: {
        participants: { some: { userId: targetUserId } },
      },
    },
    select: { roomId: true },
  })

  if (existing) return success({ roomId: existing.roomId })

  const room = await prisma.chatRoom.create({
    data: {
      participants: {
        create: [{ userId }, { userId: targetUserId }],
      },
    },
  })

  return success({ roomId: room.id }, 201)
}
