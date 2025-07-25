import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  console.log('🔍 Session Check Debug Endpoint')

  try {
    // Check SimpleAuth session
    const session = await SimpleAuth.getSessionFromRequest(request)
    console.log('SimpleAuth session:', session)

    // Check cookies
    const cookies = request.cookies.getAll()
    console.log('All cookies:', cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`))
    
    // Check database sessions
    const dbSessions = await prisma.sessions.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            agencyId: true,
            dealershipId: true
          }
        }
      },
      orderBy: {
        expires: 'desc'
      },
      take: 10
    })
    
    console.log('Database sessions:', dbSessions.length)
    
    return NextResponse.json({
      simpleAuthSession: session,
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.value.substring(0, 20) + '...',
        hasValue: !!c.value
      })),
      databaseSessions: dbSessions.map(s => ({
        id: s.id,
        sessionToken: s.sessionToken.substring(0, 20) + '...',
        userId: s.userId,
        expires: s.expires,
        user: s.users
      })),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
      }
    })
    
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({
      error: 'Session check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}