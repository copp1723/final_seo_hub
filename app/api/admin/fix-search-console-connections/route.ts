import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getSearchConsoleUrl } from '@/lib/dealership-property-mapping'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return await handleFix(req)
}

export async function POST(req: NextRequest) {
  return await handleFix(req)
}

async function handleFix(req: NextRequest) {
  // Get session from auth
  const session = await SimpleAuth.getSessionFromRequest(req)
  
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = []
    
    // Find all Search Console connections with wrong URLs
    const connections = await prisma.search_console_connections.findMany({
      where: {
        dealershipId: { not: null }
      },
      include: {
        dealerships: {
          select: { id: true, name: true }
        }
      }
    })

    logger.info('Found Search Console connections to check', { count: connections.length })

    for (const connection of connections) {
      if (!connection.dealershipId || !connection.dealerships) continue

      const correctUrl = getSearchConsoleUrl(connection.dealershipId)
      
      if (correctUrl && connection.siteUrl !== correctUrl) {
        logger.info('Fixing Search Console connection URL mismatch', {
          connectionId: connection.id,
          dealershipId: connection.dealershipId,
          dealershipName: connection.dealerships.name,
          currentUrl: connection.siteUrl,
          correctUrl
        })

        // Update the connection with correct URL
        await prisma.search_console_connections.update({
          where: { id: connection.id },
          data: {
            siteUrl: correctUrl,
            siteName: correctUrl.replace(/https?:\/\//, '').replace(/\/$/, ''),
            updatedAt: new Date()
          }
        })

        results.push({
          dealershipId: connection.dealershipId,
          dealershipName: connection.dealerships.name,
          connectionId: connection.id,
          oldUrl: connection.siteUrl,
          newUrl: correctUrl,
          status: 'fixed'
        })
      } else {
        results.push({
          dealershipId: connection.dealershipId,
          dealershipName: connection.dealerships.name,
          connectionId: connection.id,
          currentUrl: connection.siteUrl,
          correctUrl,
          status: correctUrl ? 'correct' : 'no_mapping'
        })
      }
    }

    logger.info('Search Console connection fix completed', {
      totalConnections: connections.length,
      fixedConnections: results.filter(r => r.status === 'fixed').length
    })

    return NextResponse.json({
      success: true,
      message: 'Search Console connections checked and fixed',
      results,
      summary: {
        total: connections.length,
        fixed: results.filter(r => r.status === 'fixed').length,
        correct: results.filter(r => r.status === 'correct').length,
        noMapping: results.filter(r => r.status === 'no_mapping').length
      }
    })

  } catch (error) {
    logger.error('Error fixing Search Console connections', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}