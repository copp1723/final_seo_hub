/**
 * Dealership Connection Service
 * 
 * Automatically creates GA4 and Search Console connections for dealerships
 * based on their hardcoded property mappings.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { DEALERSHIP_PROPERTY_MAPPINGS } from '@/lib/dealership-property-mapping'

export interface ConnectionCreationResult {
  success: boolean
  ga4Created: boolean
  searchConsoleCreated: boolean
  errors: string[]
  connections: {
    ga4PropertyId?: string
    searchConsoleUrl?: string
  }
}

export class DealershipConnectionService {
  /**
   * Automatically create GA4 and Search Console connections for a dealership
   * based on hardcoded property mappings
   */
  static async createConnectionsForDealership(
    dealershipId: string,
    dealershipName: string
  ): Promise<ConnectionCreationResult> {
    const result: ConnectionCreationResult = {
      success: false,
      ga4Created: false,
      searchConsoleCreated: false,
      errors: [],
      connections: {}
    }

    try {
      logger.info('Creating connections for dealership', {
        dealershipId,
        dealershipName
      })

      // Find the hardcoded mapping for this dealership
      const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealershipId)

      if (!mapping) {
        const error = `No hardcoded property mapping found for dealership: ${dealershipId}`
        logger.warn(error, { dealershipId, dealershipName })
        result.errors.push(error)
        return result
      }

      logger.info('Found property mapping', {
        dealershipId,
        ga4PropertyId: mapping.ga4PropertyId,
        searchConsoleUrl: mapping.searchConsoleUrl,
        hasAccess: mapping.hasAccess
      })

      // Check for existing connections to avoid duplicates
      const [existingGA4, existingSC] = await Promise.all([
        prisma.ga4_connections.findFirst({
          where: { 
            dealershipId,
            propertyId: mapping.ga4PropertyId 
          }
        }),
        prisma.search_console_connections.findFirst({
          where: { 
            dealershipId,
            siteUrl: mapping.searchConsoleUrl 
          }
        })
      ])

      // Create GA4 connection if needed
      if (mapping.ga4PropertyId && mapping.hasAccess && !existingGA4) {
        try {
          // Find a system user to associate with the connection
          const systemUser = await prisma.users.findFirst({
            where: {
              role: 'SUPER_ADMIN'
            }
          })

          if (!systemUser) {
            const error = 'No system user found to associate with GA4 connection'
            logger.error(error, { dealershipId })
            result.errors.push(error)
            return result
          }

          await prisma.ga4_connections.create({
            data: {
              id: `ga4_${dealershipId}_${Date.now()}`,
              userId: systemUser.id,
              dealershipId,
              propertyId: mapping.ga4PropertyId,
              propertyName: `${dealershipName} - GA4`,
              accessToken: '', // Will be populated when user authenticates
              refreshToken: '', // Will be populated when user authenticates
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          result.ga4Created = true
          result.connections.ga4PropertyId = mapping.ga4PropertyId

          logger.info('GA4 connection created successfully', {
            dealershipId,
            propertyId: mapping.ga4PropertyId
          })
        } catch (error) {
          const errorMsg = `Failed to create GA4 connection: ${error instanceof Error ? error.message : 'Unknown error'}`
          logger.error('GA4 connection creation failed', error, { dealershipId })
          result.errors.push(errorMsg)
        }
      } else if (existingGA4) {
        logger.info('GA4 connection already exists', { dealershipId, propertyId: mapping.ga4PropertyId })
        result.connections.ga4PropertyId = mapping.ga4PropertyId || undefined
      } else if (!mapping.ga4PropertyId) {
        logger.info('No GA4 property ID configured (intentional)', { 
          dealershipId, 
          reason: mapping.notes || 'No access' 
        })
      }

      // Create Search Console connection if needed
      if (mapping.searchConsoleUrl && !existingSC) {
        try {
          // Find a system user to associate with the connection
          const systemUser = await prisma.users.findFirst({
            where: {
              role: 'SUPER_ADMIN'
            }
          })

          if (!systemUser) {
            const error = 'No system user found to associate with Search Console connection'
            logger.error(error, { dealershipId })
            result.errors.push(error)
            return result
          }

          await prisma.search_console_connections.create({
            data: {
              id: `sc_${dealershipId}_${Date.now()}`,
              userId: systemUser.id,
              dealershipId,
              siteUrl: mapping.searchConsoleUrl,
              siteName: dealershipName,
              accessToken: '', // Will be populated when user authenticates
              refreshToken: '', // Will be populated when user authenticates
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          result.searchConsoleCreated = true
          result.connections.searchConsoleUrl = mapping.searchConsoleUrl

          logger.info('Search Console connection created successfully', {
            dealershipId,
            siteUrl: mapping.searchConsoleUrl
          })
        } catch (error) {
          const errorMsg = `Failed to create Search Console connection: ${error instanceof Error ? error.message : 'Unknown error'}`
          logger.error('Search Console connection creation failed', error, { dealershipId })
          result.errors.push(errorMsg)
        }
      } else if (existingSC) {
        logger.info('Search Console connection already exists', { 
          dealershipId, 
          siteUrl: mapping.searchConsoleUrl 
        })
        result.connections.searchConsoleUrl = mapping.searchConsoleUrl
      }

      // Determine overall success
      result.success = result.errors.length === 0

      logger.info('Connection creation completed', {
        dealershipId,
        success: result.success,
        ga4Created: result.ga4Created,
        searchConsoleCreated: result.searchConsoleCreated,
        errorCount: result.errors.length
      })

      return result

    } catch (error) {
      const errorMsg = `Unexpected error creating connections: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error('Dealership connection creation failed', error, { dealershipId })
      result.errors.push(errorMsg)
      return result
    }
  }

  /**
   * Bulk create connections for multiple dealerships
   */
  static async createConnectionsForMultipleDealerships(
    dealerships: Array<{ id: string; name: string }>
  ): Promise<{
    totalProcessed: number
    successCount: number
    errorCount: number
    results: Array<{ dealershipId: string; result: ConnectionCreationResult }>
  }> {
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const dealership of dealerships) {
      const result = await this.createConnectionsForDealership(dealership.id, dealership.name)
      results.push({
        dealershipId: dealership.id,
        result
      })

      if (result.success) {
        successCount++
      } else {
        errorCount++
      }
    }

    return {
      totalProcessed: dealerships.length,
      successCount,
      errorCount,
      results
    }
  }

  /**
   * Check if a dealership has all required connections
   */
  static async checkDealershipConnections(dealershipId: string): Promise<{
    hasGA4: boolean
    hasSearchConsole: boolean
    expectedGA4: string | null
    expectedSC: string | null
    isComplete: boolean
  }> {
    const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealershipId)
    
    if (!mapping) {
      return {
        hasGA4: false,
        hasSearchConsole: false,
        expectedGA4: null,
        expectedSC: null,
        isComplete: false
      }
    }

    const [ga4Connection, scConnection] = await Promise.all([
      mapping.ga4PropertyId ? prisma.ga4_connections.findFirst({
        where: { 
          dealershipId,
          propertyId: mapping.ga4PropertyId 
        }
      }) : null,
      prisma.search_console_connections.findFirst({
        where: { 
          dealershipId,
          siteUrl: mapping.searchConsoleUrl 
        }
      })
    ])

    const hasGA4 = !!ga4Connection || !mapping.ga4PropertyId // Consider "no GA4 needed" as having it
    const hasSearchConsole = !!scConnection
    const shouldHaveGA4 = mapping.ga4PropertyId !== null && mapping.hasAccess
    const shouldHaveSC = !!mapping.searchConsoleUrl

    return {
      hasGA4: hasGA4,
      hasSearchConsole: hasSearchConsole,
      expectedGA4: mapping.ga4PropertyId,
      expectedSC: mapping.searchConsoleUrl,
      isComplete: (!shouldHaveGA4 || hasGA4) && (!shouldHaveSC || hasSearchConsole)
    }
  }
}
