import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const headersList = await headers()
  const host = headersList.get('host')
  const forwardedProto = headersList.get('x-forwarded-proto')
  const forwardedHost = headersList.get('x-forwarded-host')
  
  // Get all cookies
  const cookies = request.cookies.getAll()
  const cookieInfo = cookies.map(c => ({
    name: c.name,
    value: c.value.substring(0, 20) + '...', // Truncate for security
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
      hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
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
        'x-real-ip': headersList.get('x-real-ip')
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
    database: {
      userCount: 0,
      sampleUsers: [] as any[],
      error: null as string | null
    },
    authTest: {
      simulatedSigninCheck: 'UNKNOWN',
      testEmail: 'test@example.com',
      userExists: false
    },
    recommendations: [] as string[]
  }
  
  // Test database user lookup (this is what NextAuth signin callback does)
  try {
    console.log('🔍 Testing database user lookup...')
    
    // Get total user count
    diagnostics.database.userCount = await prisma.users.count()
    console.log(`Total users: ${diagnostics.database.userCount}`)
    
    // Get sample users
    diagnostics.database.sampleUsers = await prisma.users.findMany({
      take: 5,
      select: {
        email: true,
        role: true,
        agencyId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log(`Sample users found: ${diagnostics.database.sampleUsers.length}`)
    
    // Test the exact query that NextAuth signin callback uses
    const testUser = await prisma.users.findUnique({
      where: { email: diagnostics.authTest.testEmail }
    })
    diagnostics.authTest.userExists = !!testUser
    diagnostics.authTest.simulatedSigninCheck = testUser ? 'WOULD_ALLOW' : 'WOULD_DENY'
    
    console.log(`Auth test - user ${diagnostics.authTest.testEmail} exists: ${diagnostics.authTest.userExists}`)
    
  } catch (dbError) {
    diagnostics.database.error = (dbError as Error).message
    console.error('❌ Database user lookup failed:', dbError)
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
  
  if (diagnostics.database.userCount === 0) {
    diagnostics.recommendations.push('⚠️ NO USERS IN DATABASE - This is likely the cause of login failures. Users must be invited before they can sign in.')
  }
  
  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}
