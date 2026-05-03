import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'

const isoDate = z.string().refine(
  (v) => !isNaN(new Date(v).getTime()),
  { message: 'Invalid ISO date string' }
)

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startAt: isoDate,
  endAt: isoDate.optional(),
  notifyAt: isoDate.optional(),
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

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const startAtFilter: Record<string, Date> = {}
  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) startAtFilter.gte = d
  }
  if (to) {
    const d = new Date(to)
    if (!isNaN(d.getTime())) startAtFilter.lte = d
  }

  const where = {
    userId,
    deletedAt: null,
    ...(Object.keys(startAtFilter).length ? { startAt: startAtFilter } : {}),
  }

  const schedules = await prisma.schedule.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { startAt: 'asc' },
  })

  return success({ schedules })
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

  const result = createSchema.safeParse(body)
  if (!result.success) {
    return error('Invalid input', 400)
  }

  const { title, description, startAt, endAt, notifyAt } = result.data

  const schedule = await prisma.schedule.create({
    data: {
      userId,
      title,
      description,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : undefined,
      notifyAt: notifyAt ? new Date(notifyAt) : undefined,
      version: 1,
    },
  })

  return success({ schedule }, 201)
}
