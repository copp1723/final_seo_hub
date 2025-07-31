import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, dealershipId: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let ga4Connection = null;
    let searchConsoleConnection = null;

    // For agency-level users, we need to find the relevant connection.
    // This logic assumes an agency might have one primary connection
    // or you might want to aggregate them. For now, let's find the first one.
    if (user.agencyId && (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN')) {
      const agencyDealerships = await prisma.dealerships.findMany({
        where: { agencyId: user.agencyId },
        select: { id: true }
      });

      if (agencyDealerships.length > 0) {
        const dealershipIds = agencyDealerships.map(d => d.id);
        
        ga4Connection = await prisma.ga4_connections.findFirst({
          where: { dealershipId: { in: dealershipIds } },
          select: {
            propertyId: true,
            propertyName: true,
            createdAt: true,
            updatedAt: true
          }
        });

        searchConsoleConnection = await prisma.search_console_connections.findFirst({
          where: { dealershipId: { in: dealershipIds } },
          select: {
            siteUrl: true,
            siteName: true,
            createdAt: true,
            updatedAt: true
          }
        });
      }
    }

    // Fallback or for non-agency admins, check for direct user or dealership connection
    if (!ga4Connection) {
      ga4Connection = await prisma.ga4_connections.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            { dealershipId: user.dealershipId }
          ]
        },
        select: {
          propertyId: true,
          propertyName: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }

    if (!searchConsoleConnection) {
      searchConsoleConnection = await prisma.search_console_connections.findFirst({
        where: { 
          OR: [
            { userId: session.user.id },
            { dealershipId: user.dealershipId }
          ]
         },
        select: {
          siteUrl: true,
          siteName: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }
    
    const integrations = {
      ga4: {
        connected: !!ga4Connection,
        propertyId: ga4Connection?.propertyId || null,
        propertyName: ga4Connection?.propertyName || null,
        connectedAt: ga4Connection?.createdAt || null,
        lastUpdated: ga4Connection?.updatedAt || null
      },
      searchConsole: {
        connected: !!searchConsoleConnection,
        siteUrl: searchConsoleConnection?.siteUrl || null,
        siteName: searchConsoleConnection?.siteName || null,
        connectedAt: searchConsoleConnection?.createdAt || null,
        lastUpdated: searchConsoleConnection?.updatedAt || null
      }
    }
    
    logger.info('Integrations status retrieved', {
      userId: session.user.id,
      ga4Connected: integrations.ga4.connected,
      searchConsoleConnected: integrations.searchConsole.connected
    })
    
    return NextResponse.json({
      success: true,
      data: { integrations }
    })
    
  } catch (error) {
    logger.error('Integrations status error', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations status' },
      { status: 500 }
    )
  }
}
