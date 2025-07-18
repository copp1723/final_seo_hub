import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        error: 'No session found',
        cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      })
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true,
        name: true
      }
    })

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        expires: session.expires
      },
      userInDatabase: !!user,
      user: user || null
    })

  } catch (error) {
    console.error('Auth status check error:', error)
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}