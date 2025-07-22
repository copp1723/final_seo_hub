import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get session from request
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session) {
      return NextResponse.json({
        status: 'No session found',
        cookie: request.cookies.get(SimpleAuth.COOKIE_NAME)?.value ? 'Cookie exists but invalid' : 'No cookie'
      })
    }

    // Check if user exists in database
    const user = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        agencyId: session.user.agencyId,
        dealershipId: session.user.dealershipId,
        expires: session.expires
      },
      userExists: !!user,
      userDetails: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        agencyId: user.agencyId,
        dealershipId: user.dealershipId
      } : null
    })
    
  } catch (error) {
    console.error('Session debug error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check session', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
