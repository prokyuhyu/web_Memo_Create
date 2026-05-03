export const dynamic = 'force-dynamic';
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { success, error } from '@/lib/api-response'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
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
    return error('Invalid input', 400)
  }

  const { email, password, name } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Don't reveal whether the email is already registered
    return error('Invalid input', 400)
  }

  const hashedPassword = await hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
    select: { id: true, email: true, name: true },
  })

  return success({ user }, 201)
}
