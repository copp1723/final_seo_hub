import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get session from request
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session) {
      return NextResponse.json({
        error: 'No session found',
        hasSession: false
      })
    }

    // Try to find user by session ID
    const userById = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    // Try to find user by email from session
    const userByEmail = await prisma.users.findUnique({
      where: { email: session.user.email }
    })

    // Get all users to see what's in the database
    const allUsers = await prisma.users.findMany({
      select: { id: true, email: true, name: true, role: true }
    })

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        expires: session.expires
      },
      database: {
        userFoundById: !!userById,
        userFoundByEmail: !!userByEmail,
        actualUserData: userByEmail,
        allUsers: allUsers
      },
      mismatch: {
        sessionIdExists: !!userById,
        emailExists: !!userByEmail,
        idsDifferent: userByEmail ? userByEmail.id !== session.user.id : null
      }
    })

  } catch (error) {
    console.error('Session vs DB debug error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}