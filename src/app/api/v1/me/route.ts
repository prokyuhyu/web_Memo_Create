export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { success, error } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    return e as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      handle: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) return error('Not found', 404)

  return success({ user })
}
