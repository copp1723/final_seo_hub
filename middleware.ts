import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { corsMiddleware } from '@/middleware/cors'

export async function middleware(request: NextRequest) {
  // Apply CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const corsResponse = corsMiddleware(request)
    if (request.method === 'OPTIONS') {
      return corsResponse
    }
  }

  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/error', '/api/health']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Check authentication for protected routes
  const session = await auth()
  
  if (!session && pathname !== '/') {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}