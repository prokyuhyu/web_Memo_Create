import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { requireAuth } from './auth-middleware'

const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  ADMIN: 1,
  ROOT: 2,
}

export type AuthenticatedUser = {
  userId: string
  handle: string | null
  email: string
  role: UserRole
}

/**
 * Verifies the request is authenticated and the caller meets the minimum role.
 * Role is always read from the DB — the JWT role is not trusted for authorization.
 * Throws a Response (401/403) on failure; callers must catch and return it.
 */
export async function requireRole(
  request: NextRequest,
  minRole: UserRole
): Promise<AuthenticatedUser> {
  const { userId } = await requireAuth(request)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, handle: true, email: true, role: true },
  })

  if (!user) {
    throw Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  return { userId: user.id, handle: user.handle, email: user.email, role: user.role }
}
