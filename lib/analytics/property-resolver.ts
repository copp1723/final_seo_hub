import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getGA4PropertyId, getSearchConsoleUrl, hasGA4Access } from '@/lib/dealership-property-mapping'

export interface PropertyResolution {
  propertyId?: string | null
  siteUrl?: string | null
  source: 'dealership-mapping' | 'user-connection' | 'none'
  hasAccess: boolean
}

/**
 * Unified property resolution for GA4 and Search Console
 * Ensures consistent fallback behavior across services
 */
export class PropertyResolver {
  /**
   * Resolve GA4 property ID with consistent fallback logic
   */
  static async resolveGA4Property(
    dealershipId: string | null,
    userId: string
  ): Promise<PropertyResolution> {
    try {
      // First, try dealership-specific mapping from hardcoded mappings
      if (dealershipId) {
        const propertyId = getGA4PropertyId(dealershipId)
        
        if (propertyId && hasGA4Access(dealershipId)) {
          // Check if user has access to this property
          const hasAccess = await this.checkGA4Access(userId, propertyId)
          
          if (hasAccess) {
            return {
              propertyId,
              source: 'dealership-mapping',
              hasAccess: true
            }
          }
          
          logger.warn('User lacks access to dealership GA4 property', {
            userId,
            dealershipId,
            propertyId
          })
        }
      }

      // Fallback to user's own GA4 connection
      const userConnection = await prisma.ga4_connections.findFirst({
        where: { userId },
        select: { propertyId: true }
      })

      if (userConnection?.propertyId) {
        return {
          propertyId: userConnection.propertyId,
          source: 'user-connection',
          hasAccess: true
        }
      }

      // No property found
      return {
        propertyId: null,
        source: 'none',
        hasAccess: false
      }

    } catch (error) {
      logger.error('Error resolving GA4 property', error, { dealershipId, userId })
      return {
        propertyId: null,
        source: 'none',
        hasAccess: false
      }
    }
  }

  /**
   * Resolve Search Console site URL with consistent fallback logic
   */
  static async resolveSearchConsoleUrl(
    dealershipId: string | null,
    userId: string
  ): Promise<PropertyResolution> {
    try {
      // First, try dealership-specific mapping from hardcoded mappings
      if (dealershipId) {
        const siteUrl = getSearchConsoleUrl(dealershipId)
        
        if (siteUrl) {
          // Check if user has access to this property
          const hasAccess = await this.checkSearchConsoleAccess(userId, siteUrl)
          
          if (hasAccess) {
            return {
              siteUrl,
              source: 'dealership-mapping',
              hasAccess: true
            }
          }
          
          logger.warn('User lacks access to dealership Search Console property', {
            userId,
            dealershipId,
            siteUrl
          })
        }
      }

      // Fallback to user's own Search Console connection
      const userConnection = await prisma.search_console_connections.findFirst({
        where: { userId },
        select: { siteUrl: true }
      })

      if (userConnection?.siteUrl) {
        return {
          siteUrl: userConnection.siteUrl,
          source: 'user-connection',
          hasAccess: true
        }
      }

      // No site URL found
      return {
        siteUrl: null,
        source: 'none',
        hasAccess: false
      }

    } catch (error) {
      logger.error('Error resolving Search Console URL', error, { dealershipId, userId })
      return {
        siteUrl: null,
        source: 'none',
        hasAccess: false
      }
    }
  }

  /**
   * Check if user has access to a GA4 property
   */
  private static async checkGA4Access(userId: string, propertyId: string): Promise<boolean> {
    try {
      const connection = await prisma.ga4_connections.findFirst({
        where: {
          userId,
          propertyId
        }
      })
      
      return !!connection
    } catch (error) {
      logger.error('Error checking GA4 access', error, { userId, propertyId })
      return false
    }
  }

  /**
   * Check if user has access to a Search Console property
   */
  private static async checkSearchConsoleAccess(userId: string, siteUrl: string): Promise<boolean> {
    try {
      const connection = await prisma.search_console_connections.findFirst({
        where: {
          userId,
          siteUrl
        }
      })
      
      return !!connection
    } catch (error) {
      logger.error('Error checking Search Console access', error, { userId, siteUrl })
      return false
    }
  }

  /**
   * Normalize URL for Search Console
   */
  private static normalizeUrl(url: string): string {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    return url
  }

  /**
   * Get all available properties for a user across dealerships
   */
  static async getAllAvailableProperties(userId: string): Promise<{
    ga4Properties: Array<{ propertyId: string; source: string; dealershipName?: string }>
    searchConsoleUrls: Array<{ siteUrl: string; source: string; dealershipName?: string }>
  }> {
    const result = {
      ga4Properties: [] as any[],
      searchConsoleUrls: [] as any[]
    }

    try {
      // Get user's connections
      const [ga4Connections, scConnections] = await Promise.all([
        prisma.ga4_connections.findMany({
          where: { userId },
          select: { propertyId: true, propertyName: true }
        }),
        prisma.search_console_connections.findMany({
          where: { userId },
          select: { siteUrl: true }
        })
      ])

      // Add user connections
      ga4Connections.forEach(conn => {
        if (conn.propertyId) {
          result.ga4Properties.push({
            propertyId: conn.propertyId,
            source: 'user-connection'
          })
        }
      })

      scConnections.forEach(conn => {
        if (conn.siteUrl) {
          result.searchConsoleUrls.push({
            siteUrl: conn.siteUrl,
            source: 'user-connection'
          })
        }
      })

      // Get user's dealerships
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          agencies: {
            include: {
              dealerships: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      // Add dealership properties from hardcoded mappings
      const dealerships = user?.agencies?.dealerships || []

      for (const dealership of dealerships) {
        const propertyId = getGA4PropertyId(dealership.id)
        if (propertyId && hasGA4Access(dealership.id)) {
          const hasAccess = await this.checkGA4Access(userId, propertyId)
          if (hasAccess) {
            result.ga4Properties.push({
              propertyId,
              source: 'dealership-mapping',
              dealershipName: dealership.name
            })
          }
        }

        const siteUrl = getSearchConsoleUrl(dealership.id)
        if (siteUrl) {
          const hasAccess = await this.checkSearchConsoleAccess(userId, siteUrl)
          if (hasAccess) {
            result.searchConsoleUrls.push({
              siteUrl,
              source: 'dealership-mapping',
              dealershipName: dealership.name
            })
          }
        }
      }

    } catch (error) {
      logger.error('Error getting available properties', error, { userId })
    }

    return result
  }
}