import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'

const authRoutes = [
  '/auth/signin',
  '/auth/simple-signin',
  '/auth/error'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Skip for API/next/static/assets
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const session = await SimpleAuth.getSessionFromRequest(request)

  // Prevent accessing auth routes when already signed in
  if (isAuthRoute && session) {
    const siteUrl = process.env.NEXTAUTH_URL || request.url
    return NextResponse.redirect(new URL('/dashboard', siteUrl))
  }

  // Protect all app routes except explicitly public ones
  const isPublic = pathname === '/' || pathname.startsWith('/privacy') || pathname.startsWith('/terms')
  const isApi = pathname.startsWith('/api')

  if (!isPublic && !isApi && !session) {
    const siteUrl = process.env.NEXTAUTH_URL || request.url
    return NextResponse.redirect(new URL('/auth/simple-signin', siteUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}

// Removed re-export to avoid duplicate export errors during build
