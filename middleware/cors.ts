import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.NEXTAUTH_URL || 'https://yourdomain.com',
      // Add any other allowed production origins
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      // Add any other development origins
    ]

export function corsMiddleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const response = NextResponse.next()

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
    response.headers.set('Access-Control-Max-Age', '86400')
    return new NextResponse(null, { status: 200, headers: response.headers })
  }

  return response
}
