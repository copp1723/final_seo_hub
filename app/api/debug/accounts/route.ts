import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session) {
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

    // Get users without accounts
    const usersWithoutAccounts = await prisma.users.findMany({
      where: {
        accounts: {
          none: {}
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyId: true,
        dealershipId: true,
        createdAt: true
      }
    })

    // Get statistics
    const stats = {
      totalAccounts: accounts.length,
      totalSessions: sessions.length,
      totalUsers: await prisma.users.count(),
      usersWithAccounts: new Set(accounts.map(a => a.userId)).size,
      usersWithoutAccounts: usersWithoutAccounts.length,
      activeSessionsCount: sessions.filter(s => s.expires > new Date()).length,
      expiredSessionsCount: sessions.filter(s => s.expires <= new Date()).length
    }

    return NextResponse.json({
      stats,
      accounts: accounts.slice(0, 20), // Limit to prevent huge responses
      sessions: sessions.slice(0, 20),
      usersWithoutAccounts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug information' },
      { status: 500 }
    )
  }
}
