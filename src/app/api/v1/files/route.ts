import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { success, error } from '@/lib/api-response'
import { storage } from '@/lib/storage'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

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
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
  const search = searchParams.get('search') ?? ''

  const where = {
    userId,
    deletedAt: null,
    ...(search ? { originalName: { contains: search, mode: 'insensitive' as const } } : {}),
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, originalName: true, size: true, mimeType: true, createdAt: true },
    }),
    prisma.file.count({ where }),
  ])

  return success({ files, total, page, limit })
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return error('Invalid form data', 400)
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    return error('No file provided', 400)
  }

  // Size validation before saving to disk
  if (fileEntry.size > MAX_FILE_SIZE) {
    return error('File exceeds 50MB limit', 400)
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer())
  const { storedName, path: filePath, size } = await storage.save(
    userId,
    buffer,
    fileEntry.name,
    fileEntry.type
  )

  const file = await prisma.file.create({
    data: {
      userId,
      originalName: fileEntry.name,
      storedName,
      mimeType: fileEntry.type || 'application/octet-stream',
      size,
      path: filePath,
    },
    select: { id: true, originalName: true, size: true, mimeType: true, createdAt: true },
  })

  return success({ file }, 201)
}
