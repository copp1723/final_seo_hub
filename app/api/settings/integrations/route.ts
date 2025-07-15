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
  if (!authResult.authenticated) return authResult.response
  
  try {
    // Get user's dealership for connection queries or handle agency admin access
    const targetDealershipId = authResult.user.dealership.id
    
    // For agency admins without a dealership, show empty integrations state
    // This allows them to see the UI and connect integrations
    if (!targetDealershipId && authResult.user.role === 'AGENCY_ADMIN' && authResult.user.agency.id) {
      // Return empty integrations state for agency admins
      const integrations = {
        ga4: {
          connected: false,
          propertyId: null,
          propertyName: null,
          connectedAt: null,
          lastUpdated: null
        },
        searchConsole: {
          connected: false,
          siteUrl: null,
          siteName: null,
          connectedAt: null,
          lastUpdated: null
        }
      }
      
      return successResponse({ integrations })
    }
    
    // For SUPER_ADMIN without dealership, also show empty state
    if (!targetDealershipId && authResult.user.role === 'SUPER_ADMIN') {
      const integrations = {
        ga4: {
          connected: false,
          propertyId: null,
          propertyName: null,
          connectedAt: null,
          lastUpdated: null
        },
        searchConsole: {
          connected: false,
          siteUrl: null,
          siteName: null,
          connectedAt: null,
          lastUpdated: null
        }
      }
      
      return successResponse({ integrations })
    }
    
    if (!targetDealershipId) {
      return errorResponse('User not assigned to a dealership', 400)
    }

    // Fetch all integration statuses in parallel
    const [ga4Connection, searchConsoleConnection] = await Promise.all([
      prisma.ga4_connections.findUnique({
        where: { userId: targetDealershipId },
        select: {
          propertyId: true,
          propertyName: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.search_console_connections.findUnique({
        where: { userId: targetDealershipId },
        select: {
          siteUrl: true,
          siteName: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ])
    
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
    
    return successResponse({ integrations })
  } catch (error) {
    logger.error('Error fetching integration status:', error, { userId: authResult.user.id })
    return errorResponse('Failed to fetch integration status', 500)
  }
}
