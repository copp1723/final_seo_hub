import { NextRequest, NextResponse } from 'next/server'
import { withValidation, errorResponse, successResponse } from '@/lib/api/route-utils'
import { SearchConsoleAPI } from '@/lib/api/search-console-api'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

const setPrimarySiteSchema = z.object({
  siteUrl: z.string().url(),
  dealershipId: z.string().optional()
})

export const POST = withValidation(setPrimarySiteSchema)(
  async (data, session, request) => {
    const { siteUrl, dealershipId } = data
    
    try {
      // Get user's info
      const user = await prisma.users.findUnique({
        where: { id: session.user.id },
        select: { dealershipId: true, role: true, agencyId: true }
      })

      // Determine target dealership
      let targetDealershipId = dealershipId || user?.dealershipId
      
      // If agency admin is setting site for a specific dealership
      if (dealershipId && user?.role === 'AGENCY_ADMIN' && user?.agencyId) {
        // Verify the dealership belongs to the agency
        const dealership = await prisma.dealerships.findFirst({
          where: {
            id: dealershipId,
            agencyId: user.agencyId
          }
        })
        
        if (!dealership) {
          return errorResponse(
            'Dealership not found or does not belong to your agency',
            403
          )
        }
        targetDealershipId = dealershipId
      }

      if (!targetDealershipId) {
        return errorResponse('No dealership context available', 400)
      }

      // Update the primary site for the user's connection
      const connection = await SearchConsoleAPI.getConnection(session.user.id)
      
      if (!connection) {
        return errorResponse('No Search Console connection found', 404)
      }

      await prisma.search_console_connections.update({
        where: { id: connection.id },
        data: {
          siteUrl: siteUrl,
          siteName: new URL(siteUrl).hostname
        }
      })
      
      return successResponse({ 
        message: 'Primary site updated successfully',
        siteUrl,
        siteName: new URL(siteUrl).hostname
      })
    } catch (error) {
      logger.error('Failed to update primary site', error, { userId: session.user.id })
      return errorResponse('Failed to update primary site', 500, error)
    }
  }
)
