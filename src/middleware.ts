import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const enc = (s: string) => new TextEncoder().encode(s)

// Dashboard pages served from the (dashboard) route group
const DASHBOARD_PATHS = ['/files', '/calendar', '/notes']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public auth endpoints — always allow
  if (pathname.startsWith('/api/v1/auth/')) {
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

  // Protected dashboard UI routes — redirect to /login if no token cookie hint
  if (DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const tokenCookie = request.cookies.get('token')
    if (!tokenCookie?.value) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(tokenCookie.value, enc(process.env.JWT_SECRET!))
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
