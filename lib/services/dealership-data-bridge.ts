/**
 * Dealership Data Bridge
 * 
 * This service acts as a bridge between the user's agency-level connections
 * and dealership-specific data requirements. It ensures that when an agency
 * user switches between dealerships, the correct data sources are used.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getGA4PropertyId, getSearchConsoleUrl, hasGA4Access } from '@/lib/dealership-property-mapping'

export interface DealershipDataConnection {
  dealershipId: string
  dealershipName: string
  ga4: {
    hasConnection: boolean
    propertyId: string | null
    connectionId: string | null
    source: 'dealership' | 'agency' | 'user' | 'mapping'
  }
  searchConsole: {
    hasConnection: boolean
    siteUrl: string | null
    connectionId: string | null
    source: 'dealership' | 'agency' | 'user' | 'mapping'
  }
}

export class DealershipDataBridge {
  
  /**
   * Resolve the correct data connections for a specific dealership
   * This is the key method that determines which connections to use
   */
  async resolveDealershipConnections(
    userId: string, 
    dealershipId: string
  ): Promise<DealershipDataConnection> {
    
    logger.info('🔍 Resolving dealership connections', { userId, dealershipId })

    // Get dealership info
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      select: { id: true, name: true, agencyId: true }
    })

    if (!dealership) {
      throw new Error(`Dealership ${dealershipId} not found`)
    }

    // Get user info
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true, dealershipId: true }
    })

    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    // Resolve GA4 connection
    const ga4Connection = await this.resolveGA4Connection(userId, dealershipId, user, dealership)
    
    // Resolve Search Console connection
    const searchConsoleConnection = await this.resolveSearchConsoleConnection(userId, dealershipId, user, dealership)

    const result: DealershipDataConnection = {
      dealershipId,
      dealershipName: dealership.name,
      ga4: ga4Connection,
      searchConsole: searchConsoleConnection
    }

    logger.info('✅ Dealership connections resolved', {
      dealershipId,
      ga4Source: ga4Connection.source,
      ga4PropertyId: ga4Connection.propertyId,
      searchConsoleSource: searchConsoleConnection.source,
      searchConsoleSiteUrl: searchConsoleConnection.siteUrl
    })

    return result
  }

  /**
   * Resolve GA4 connection for a dealership
   * Priority: Dealership-specific > Mapping > Agency > User
   */
  private async resolveGA4Connection(
    userId: string,
    dealershipId: string,
    user: any,
    dealership: any
  ) {
    // 1. Check for dealership-specific GA4 connection
    const dealershipGA4 = await prisma.ga4_connections.findFirst({
      where: { dealershipId },
      orderBy: { updatedAt: 'desc' }
    })

    if (dealershipGA4 && dealershipGA4.accessToken && dealershipGA4.propertyId) {
      return {
        hasConnection: true,
        propertyId: dealershipGA4.propertyId,
        connectionId: dealershipGA4.id,
        source: 'dealership' as const
      }
    }

    // 2. Check dealership property mapping
    const mappedPropertyId = getGA4PropertyId(dealershipId)
    if (mappedPropertyId && hasGA4Access(dealershipId)) {
      // Need to find a connection that can access this property
      // Look for agency or user connections with valid tokens
      const agencyConnection = await this.findValidGA4Connection(user.agencyId, userId)
      
      if (agencyConnection) {
        return {
          hasConnection: true,
          propertyId: mappedPropertyId,
          connectionId: agencyConnection.id,
          source: 'mapping' as const
        }
      }
    }

    // 3. Check for agency-level GA4 connection (ONLY as a fallback when dealership has no specific connection)
    // DISABLED: Agency-level GA4 fallback causes data contamination
    // This was returning wrong dealership data when specific connections existed but were corrupted
    // Keep this disabled until we have proper dealership validation in place
    /*
    if (user.agencyId) {
      // Look for a general agency connection (not tied to specific dealerships)
      const agencyGA4 = await prisma.ga4_connections.findFirst({
        where: { 
          dealershipId: null, // Agency-level connection, not tied to specific dealership
          userId: { 
            in: await prisma.users.findMany({
              where: { agencyId: user.agencyId, role: { in: ['AGENCY_ADMIN', 'SUPER_ADMIN'] } },
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (agencyGA4 && agencyGA4.accessToken && agencyGA4.propertyId) {
        logger.info('Using agency-level GA4 connection for dealership', { 
          dealershipId, 
          connectionId: agencyGA4.id,
          propertyId: agencyGA4.propertyId
        })
        return {
          hasConnection: true,
          propertyId: agencyGA4.propertyId,
          connectionId: agencyGA4.id,
          source: 'agency' as const
        }
      }
    }
    */

    // 4. Fallback to user-level connection
    const userGA4 = await prisma.ga4_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (userGA4 && userGA4.accessToken && userGA4.propertyId) {
      return {
        hasConnection: true,
        propertyId: userGA4.propertyId,
        connectionId: userGA4.id,
        source: 'user' as const
      }
    }

    return {
      hasConnection: false,
      propertyId: null,
      connectionId: null,
      source: 'user' as const
    }
  }

  /**
   * Resolve Search Console connection for a dealership
   * Priority: Dealership-specific > Mapping > Agency > User
   */
  private async resolveSearchConsoleConnection(
    userId: string,
    dealershipId: string,
    user: any,
    dealership: any
  ) {
    // 1. Check for dealership-specific Search Console connection
    const dealershipSC = await prisma.search_console_connections.findFirst({
      where: { dealershipId },
      orderBy: { updatedAt: 'desc' }
    })

    if (dealershipSC && dealershipSC.accessToken && dealershipSC.siteUrl) {
      // ROOT FIX: ALWAYS use the correct URL for THIS dealership, never trust database URLs
      const expectedUrl = getSearchConsoleUrl(dealershipId)
      
      if (expectedUrl) {
        // We have a mapping - ALWAYS use it, ignore whatever is in the database
        if (dealershipSC.siteUrl !== expectedUrl) {
          logger.warn('Database URL override - enforcing correct dealership URL', {
            dealershipId,
            databaseUrl: dealershipSC.siteUrl,
            correctUrl: expectedUrl,
            connectionId: dealershipSC.id
          })
        }
        
        return {
          hasConnection: true,
          siteUrl: expectedUrl, // ALWAYS use the mapped URL
          connectionId: dealershipSC.id,
          source: 'dealership' as const
        }
      } else {
        // No mapping exists - use database URL but warn
        logger.warn('No URL mapping found for dealership - using database URL', {
          dealershipId,
          databaseUrl: dealershipSC.siteUrl,
          connectionId: dealershipSC.id
        })
        
        return {
          hasConnection: true,
          siteUrl: dealershipSC.siteUrl,
          connectionId: dealershipSC.id,
          source: 'dealership' as const
        }
      }
    }

    // 2. DISABLED: Dealership property mapping with agency connections causes data mixing
    // This was still using agency connections that have wrong siteUrl data
    if (false) {
      const mappedSiteUrl = getSearchConsoleUrl(dealershipId)
      if (mappedSiteUrl) {
        // Need to find a connection that can access this site
        // Look for agency or user connections with valid tokens
        const agencyConnection = await this.findValidSearchConsoleConnection(user.agencyId, userId)
        
        if (agencyConnection) {
          return {
            hasConnection: true,
            siteUrl: mappedSiteUrl,
            connectionId: agencyConnection.id,
            source: 'mapping' as const
          }
        }
      }
    }

    // 3. DISABLED: Agency-level fallback causes data mixing between dealerships
    // This was causing Acura of Columbus to show Jay Hatfield data
    if (false && user.agencyId) {
      // Look for a general agency connection (not tied to specific dealerships)
      const agencySC = await prisma.search_console_connections.findFirst({
        where: { 
          dealershipId: null, // Agency-level connection, not tied to specific dealership
          userId: { 
            in: await prisma.users.findMany({
              where: { agencyId: user.agencyId, role: { in: ['AGENCY_ADMIN', 'SUPER_ADMIN'] } },
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (agencySC && agencySC.accessToken && agencySC.siteUrl) {
        logger.info('Using agency-level Search Console connection for dealership', { 
          dealershipId, 
          connectionId: agencySC.id,
          siteUrl: agencySC.siteUrl
        })
        return {
          hasConnection: true,
          siteUrl: agencySC.siteUrl,
          connectionId: agencySC.id,
          source: 'agency' as const
        }
      }
    }

    // 4. Fallback to user-level connection
    const userSC = await prisma.search_console_connections.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })

    if (userSC && userSC.accessToken && userSC.siteUrl) {
      return {
        hasConnection: true,
        siteUrl: userSC.siteUrl,
        connectionId: userSC.id,
        source: 'user' as const
      }
    }

    return {
      hasConnection: false,
      siteUrl: null,
      connectionId: null,
      source: 'user' as const
    }
  }

  /**
   * Find a valid GA4 connection for agency or user
   */
  private async findValidGA4Connection(agencyId: string | null, userId: string) {
    // FIXED: Only look for true agency-level connections, not random dealership connections
    if (agencyId) {
      // Look for agency-level connections (not tied to specific dealerships)
      const agencyConnection = await prisma.ga4_connections.findFirst({
        where: { 
          dealershipId: null, // Only agency-level connections
          accessToken: { not: "" },
          userId: { 
            in: await prisma.users.findMany({
              where: { agencyId, role: { in: ['AGENCY_ADMIN', 'SUPER_ADMIN'] } },
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (agencyConnection) {
        logger.info('Found valid agency-level GA4 connection for mapping', {
          agencyId,
          connectionId: agencyConnection.id,
          propertyId: agencyConnection.propertyId
        })
        return agencyConnection
      }
    }

    // Fallback to user connection
    return await prisma.ga4_connections.findFirst({
      where: { 
        userId,
        accessToken: { not: "" }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  /**
   * Find a valid Search Console connection for agency or user
   */
  private async findValidSearchConsoleConnection(agencyId: string | null, userId: string) {
    // FIXED: Only look for true agency-level connections, not random dealership connections
    if (agencyId) {
      // Look for agency-level connections (not tied to specific dealerships)
      const agencyConnection = await prisma.search_console_connections.findFirst({
        where: { 
          dealershipId: null, // Only agency-level connections
          accessToken: { not: "" },
          userId: { 
            in: await prisma.users.findMany({
              where: { agencyId, role: { in: ['AGENCY_ADMIN', 'SUPER_ADMIN'] } },
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (agencyConnection) {
        logger.info('Found valid agency-level Search Console connection for mapping', {
          agencyId,
          connectionId: agencyConnection.id,
          siteUrl: agencyConnection.siteUrl
        })
        return agencyConnection
      }
    }

    // Fallback to user connection
    return await prisma.search_console_connections.findFirst({
      where: { 
        userId,
        accessToken: { not: "" }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  /**
   * Get the appropriate connection for making API calls
   */
  async getConnectionForApiCall(connectionId: string, type: 'ga4' | 'search_console') {
    if (type === 'ga4') {
      return await prisma.ga4_connections.findUnique({
        where: { id: connectionId }
      })
    } else {
      return await prisma.search_console_connections.findUnique({
        where: { id: connectionId }
      })
    }
  }

  /**
   * Validate that a user has access to a dealership
   */
  async validateDealershipAccess(userId: string, dealershipId: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true, agencyId: true, dealershipId: true }
    })

    if (!user) return false

    // Super admins have access to all dealerships
    if (user.role === 'SUPER_ADMIN') return true

    // Check if user's dealership matches
    if (user.dealershipId === dealershipId) return true

    // Check if dealership belongs to user's agency
    if (user.agencyId) {
      const dealership = await prisma.dealerships.findFirst({
        where: {
          id: dealershipId,
          agencyId: user.agencyId
        }
      })
      return !!dealership
    }

    return false
  }
}

// Export singleton instance
export const dealershipDataBridge = new DealershipDataBridge()