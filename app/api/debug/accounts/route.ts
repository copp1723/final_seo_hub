import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow SUPER_ADMIN to access this debug endpoint
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all accounts with user information
    const accounts = await prisma.accounts.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            agencyId: true,
            dealershipId: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        userId: 'desc'
      }
    })

    // Get all sessions with user information
    const sessions = await prisma.sessions.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        expires: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts.map(account => ({
          id: account.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          userId: account.users.id,
          user: account.users
        })),
        sessions: sessions.map(session => ({
          id: session.id,
          sessionToken: session.sessionToken.substring(0, 20) + '...', // Truncate for security
          userId: session.users.id,
          user: session.users,
          expires: session.expires
        })),
        summary: {
          totalAccounts: accounts.length,
          totalSessions: sessions.length,
          accountsByProvider: accounts.reduce((acc, account) => {
            acc[account.provider] = (acc[account.provider] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          activeSessionsCount: sessions.filter(s => s.expires > new Date()).length
        }
      }
    })

  } catch (error) {
    console.error('Debug accounts error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch account debug data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
