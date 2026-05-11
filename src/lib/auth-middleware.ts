import { NextRequest } from 'next/server'
import { verifyAccessToken } from './jwt'

export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string; role: string }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const payload = await verifyAccessToken(token)
  if (!payload) {
    throw Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return payload
}
