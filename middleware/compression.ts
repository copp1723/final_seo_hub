import { NextRequest, NextResponse } from 'next/server'

/**
 * Compression middleware for API responses
 * Next.js automatically handles compression for static assets and pages
 * This is for API routes that return JSON data
 */

export function compressionMiddleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Set cache headers for GET requests
  if (request.method === 'GET') {
    // Cache static API responses for 5 minutes
    if (request.nextUrl.pathname.includes('/api/health') ||
        request.nextUrl.pathname.includes('/api/csrf')) {
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    }
    // Cache user-specific data for 1 minute
    else if (request.nextUrl.pathname.includes('/api/settings') ||
             request.nextUrl.pathname.includes('/api/requests')) {
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    }
  }

  // Enable compression hints
  response.headers.set('Content-Encoding', 'gzip')
  response.headers.set('Vary', 'Accept-Encoding')

  return response
}