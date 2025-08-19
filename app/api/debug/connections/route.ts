import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Disable in production for safety
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Debug route disabled in production' }, { status: 403 })
    }

    // Get user info
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        dealershipId: true,
        dealerships_users_dealershipIdTodealerships: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get all GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          ...(user?.dealershipId ? [{ dealershipId: user.dealershipId }] : [])
        ]
      },
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        propertyId: true,
        propertyName: true,
        createdAt: true,
        expiresAt: true
      }
    })

    // Get all Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          ...(user?.dealershipId ? [{ dealershipId: user.dealershipId }] : [])
        ]
      },
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        siteUrl: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      user,
      ga4Connections,
      scConnections,
      summary: {
        hasGA4Connection: ga4Connections.length > 0,
        hasSearchConsoleConnection: scConnections.length > 0,
        ga4Count: ga4Connections.length,
        scCount: scConnections.length
      }
    })

  } catch (error) {
    console.error('Debug connections error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection debug info' },
      { status: 500 }
    )
  }
}
