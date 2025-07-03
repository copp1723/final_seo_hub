import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const headersList = headers()
  const host = headersList.get('host')
  const forwardedProto = headersList.get('x-forwarded-proto')
  const forwardedHost = headersList.get('x-forwarded-host')
  
  // Get all cookies
  const cookies = request.cookies.getAll()
  const cookieInfo = cookies.map(c => ({
    name: c.name,
    value: c.value.substring(0, 20) + '...', // Truncate for security
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite
  }))
  
  // Check for session cookies
  const sessionCookie = cookies.find(c => 
    c.name === 'next-auth.session-token' || 
    c.name === '__Secure-next-auth.session-token'
  )
  
  const diagnostics = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    request: {
      url: request.url,
      method: request.method,
      host,
      forwardedProto,
      forwardedHost,
      protocol: new URL(request.url).protocol,
      headers: {
        'user-agent': headersList.get('user-agent'),
        'x-forwarded-for': headersList.get('x-forwarded-for'),
        'x-real-ip': headersList.get('x-real-ip'),
      }
    },
    cookies: {
      count: cookies.length,
      hasSessionCookie: !!sessionCookie,
      sessionCookieName: sessionCookie?.name,
      cookieDetails: cookieInfo
    },
    authConfig: {
      expectedCookiePrefix: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : '',
      isSecureContext: process.env.NEXTAUTH_URL?.startsWith('https://'),
      isProduction: process.env.NODE_ENV === 'production'
    },
    recommendations: []
  }
  
  // Add recommendations based on diagnostics
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.startsWith('https://')) {
    diagnostics.recommendations.push('NEXTAUTH_URL should use HTTPS in production')
  }
  
  if (!sessionCookie) {
    diagnostics.recommendations.push('No session cookie found - user may not be authenticated')
  }
  
  if (forwardedProto === 'http' && process.env.NODE_ENV === 'production') {
    diagnostics.recommendations.push('X-Forwarded-Proto is HTTP in production - this may cause secure cookie issues')
  }
  
  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}