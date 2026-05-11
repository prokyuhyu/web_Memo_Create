export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { success, error } from '@/lib/api-response'
import { requireRole, AuthenticatedUser } from '@/lib/require-role'

const schema = z.object({
  targetUserId: z.string().min(1),
  role: z.enum(['USER', 'ADMIN', 'ROOT']),
})

export async function PATCH(request: NextRequest) {
  let actor: AuthenticatedUser
  try {
    actor = await requireRole(request, UserRole.ROOT)
  } catch (e) {
    return e as Response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body', 400)
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return error('Invalid input', 400)
  }

  const { targetUserId, role: newRole } = result.data

  // Prevent ROOT from accidentally downgrading their own account
  if (targetUserId === actor.userId && newRole !== 'ROOT') {
    return error('Cannot downgrade your own ROOT role', 403)
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, handle: true, email: true, role: true },
  })

  if (!target) {
    return error('User not found', 404)
  }

  const oldRole = target.role

  // Prevent removing the last ROOT account
  if (oldRole === UserRole.ROOT && newRole !== 'ROOT') {
    const rootCount = await prisma.user.count({ where: { role: UserRole.ROOT } })
    if (rootCount <= 1) {
      return error('Cannot remove the last ROOT account', 403)
    }
  }

  // No-op: role is already what was requested
  if (oldRole === newRole) {
    return success({
      userId: target.id,
      handle: target.handle,
      email: target.email,
      oldRole,
      newRole,
      changed: false,
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { role: newRole as UserRole },
    })

    await tx.adminAuditLog.create({
      data: {
        actorId: actor.userId,
        action: 'role:change',
        targetId: targetUserId,
        args: { oldRole, newRole },
        result: 'ok',
      },
    })
  })

  return success({
    userId: target.id,
    handle: target.handle,
    email: target.email,
    oldRole,
    newRole,
    changed: true,
  })
}
