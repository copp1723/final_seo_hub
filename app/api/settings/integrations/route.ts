import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    // Get user's dealership for connection queries or handle agency admin access
    let targetDealershipId = authResult.user.dealershipId
    
    // If user is agency admin, they might be accessing on behalf of a dealership
    if (!targetDealershipId && authResult.user.role === 'AGENCY_ADMIN' && authResult.user.agencyId) {
      // For agency admins, we need a dealershipId parameter or default behavior
      // For now, return an appropriate error since this endpoint needs dealership context
      return errorResponse('Agency admins must specify dealership context for integration settings', 400)
    }
    
    if (!targetDealershipId) {
      return errorResponse('User not assigned to a dealership', 400)
    }

    // Fetch all integration statuses in parallel
    const [ga4Connection, searchConsoleConnection] = await Promise.all([
      prisma.gA4Connection.findUnique({
        where: { dealershipId: targetDealershipId },
        select: {
          propertyId: true,
          propertyName: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.searchConsoleConnection.findUnique({
        where: { dealershipId: targetDealershipId },
        select: {
          siteUrl: true,
          siteName: true,
          createdAt: true,
          updatedAt: true,
        }
      })
    ])
    
    const integrations = {
      ga4: {
        connected: !!ga4Connection,
        propertyId: ga4Connection?.propertyId || null,
        propertyName: ga4Connection?.propertyName || null,
        connectedAt: ga4Connection?.createdAt || null,
        lastUpdated: ga4Connection?.updatedAt || null,
      },
      searchConsole: {
        connected: !!searchConsoleConnection,
        siteUrl: searchConsoleConnection?.siteUrl || null,
        siteName: searchConsoleConnection?.siteName || null,
        connectedAt: searchConsoleConnection?.createdAt || null,
        lastUpdated: searchConsoleConnection?.updatedAt || null,
      }
    }
    
    return successResponse({ integrations })
  } catch (error) {
    logger.error('Error fetching integration status:', error, { userId: authResult.user.id })
    return errorResponse('Failed to fetch integration status', 500)
  }
}