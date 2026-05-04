export const dynamic = 'force-dynamic';
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { success, error } from '@/lib/api-response'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
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
    return error('Invalid credentials', 401)
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({ where: { email } })
  // Constant-time path: always compare even when user not found to resist timing attacks
  const passwordHash = user?.password ?? '$2a$12$invalidhashfortimingequalisation'
  const valid = await compare(password, passwordHash)

  if (!user || !valid) {
    return error('Invalid credentials', 401)
  }

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(user.id),
  ])

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })



  return success({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  })
}
