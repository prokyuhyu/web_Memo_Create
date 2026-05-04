import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  let userId: string
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
  } catch (e) {
    if (e instanceof Response) return e
    return error('Internal server error', 500)
  }

  const users = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return success({ users })
}
