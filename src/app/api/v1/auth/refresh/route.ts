import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { success, error } from '@/lib/api-response'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/jwt'

const schema = z.object({
  refreshToken: z.string(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Invalid request body', 400)
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return error('Invalid token', 401)
  }

  const { refreshToken } = result.data

  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) {
    return error('Invalid token', 401)
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token: refreshToken } })
    return error('Invalid token', 401)
  }

  // Rotation: delete old token before issuing new pair
  await prisma.refreshToken.delete({ where: { token: refreshToken } })

  const [newAccessToken, newRefreshToken] = await Promise.all([
    generateAccessToken(payload.userId),
    generateRefreshToken(payload.userId),
  ])

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: payload.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return success({ accessToken: newAccessToken, refreshToken: newRefreshToken })
}
