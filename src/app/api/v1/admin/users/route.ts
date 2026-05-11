export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { success } from '@/lib/api-response'
import { requireRole, AuthenticatedUser } from '@/lib/require-role'

export async function GET(request: NextRequest) {
  let _actor: AuthenticatedUser
  try {
    _actor = await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

  const search = new URL(request.url).searchParams.get('search')?.trim() || undefined

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { handle: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      handle: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return success({ users })
}
