import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const enc = (s: string) => new TextEncoder().encode(s)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public auth endpoints — always allow
  if (pathname.startsWith('/api/v1/auth/')) {
    return NextResponse.next()
  }

  // Public community feed — no auth required
  if (pathname.startsWith('/api/v1/community')) {
    return NextResponse.next()
  }

  // Migration endpoint — temporary public access
  if (pathname === '/api/v1/admin/migrate-profile-rooms') {
    return NextResponse.next()
  }

  // Public pinned notices — read-only, displayed on public community feed
  if (pathname === '/api/v1/notices/pinned' && request.method === 'GET') {
    return NextResponse.next()
  }

  // Public notes API — let the route handler decide based on isPublic
  if (pathname.startsWith('/api/v1/notes/') && request.method === 'GET') {
    return NextResponse.next()
  }

  // Protected API routes — require valid Bearer token
  if (pathname.startsWith('/api/v1/')) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await jwtVerify(token, enc(process.env.JWT_SECRET!))
      return NextResponse.next()
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Dashboard UI routes: tokens live in localStorage (client-side only).
  // Auth guard is handled client-side; middleware just passes through.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
