import { NextRequest, NextResponse } from 'next/server'

// CORS configuration
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'https://accounts.google.com',
    'https://oauth.googleusercontent.com',
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') || [])
  ].filter(Boolean)

  // In development, allow all origins
  const allowOrigin = process.env.NODE_ENV === 'development' 
    ? '*' 
    : (origin && allowedOrigins.includes(origin)) ? origin : 'null'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-API-Key',
    'Access-Control-Allow-Credentials': process.env.NODE_ENV === 'production' ? 'true' : 'false',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

// Apply CORS headers to response
export function corsResponse(response: NextResponse, origin?: string): NextResponse {
  const headers = getCorsHeaders(origin)
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

// Handle preflight requests
export function handlePreflight(origin?: string): NextResponse {
  const headers = getCorsHeaders(origin)
  return new NextResponse(null, {
    status: 200,
    headers
  })
}

// Wrapper to add CORS to any API handler
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const origin = req.headers.get('origin') || undefined

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return handlePreflight(origin)
    }

    // Execute handler and add CORS headers
    const response = await handler(req)
    return corsResponse(response, origin)
  }
}