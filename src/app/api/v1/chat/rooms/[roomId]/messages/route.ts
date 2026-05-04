import { NextRequest } from 'next/server'
import { z } from 'zod'
import Pusher from 'pusher'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.PUSHER_APP_CLUSTER!,
  useTLS: true,
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
})

type RouteParams = { params: Promise<{ roomId: string }> }

async function verifyParticipant(roomId: string, userId: string) {
  const participant = await prisma.chatRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  return !!participant
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const { roomId } = await params

  if (!(await verifyParticipant(roomId, userId))) {
    return error('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')

  const messages = await prisma.chatMessage.findMany({
    where: { roomId, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  return success({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: m.sender.name,
      createdAt: m.createdAt,
    })),
  })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const { roomId } = await params

  if (!(await verifyParticipant(roomId, userId))) {
    return error('Forbidden', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON', 400)
  }

  const result = sendMessageSchema.safeParse(body)
  if (!result.success) return error('Invalid input', 400)

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  const message = await prisma.chatMessage.create({
    data: { roomId, senderId: userId, content: result.data.content },
  })

  await prisma.chatRoom.update({
    where: { id: roomId },
    data: { updatedAt: new Date() },
  })

  const payload = {
    id: message.id,
    content: message.content,
    senderId: message.senderId,
    senderName: sender?.name ?? '',
    createdAt: message.createdAt,
  }

  await pusher.trigger(`chat-room-${roomId}`, 'new-message', payload)

  return success({ message: payload }, 201)
}
