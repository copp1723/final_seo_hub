/**
 * OAuth Dealership Resolver
 * 
 * Centralized service to handle dealership resolution during OAuth callbacks.
 * Ensures consistent dealership association and validates user access.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export interface DealershipResolutionResult {
  dealershipId: string | null
  isValid: boolean
  reason?: string
  fallbackDealership?: string | null
}

export interface UserDealershipContext {
  userId: string
  userDealershipId: string | null
  userCurrentDealershipId: string | null
  agencyId: string | null
  role: string
}

export class OAuthDealershipResolver {
  
  /**
   * Resolve the correct dealership for OAuth callback based on user context
   * and state information passed during OAuth initiation
   */
  async resolveDealershipForCallback(
    userId: string,
    stateData?: any
  ): Promise<DealershipResolutionResult> {
    
    logger.info('🔍 Resolving dealership for OAuth callback', { userId, stateData })
    
    try {
      // Get current user context
      const userContext = await this.getUserContext(userId)
      if (!userContext) {
        return {
          dealershipId: null,
          isValid: false,
          reason: 'User not found'
        }
      }
      
      // If state data includes dealership context, use that and validate access
      if (stateData?.dealershipId) {
        const hasAccess = await this.validateDealershipAccess(userContext, stateData.dealershipId)
        if (hasAccess) {
          return {
            dealershipId: stateData.dealershipId,
            isValid: true
          }
        } else {
          logger.warn('User lost access to requested dealership during OAuth flow', {
            userId,
            requestedDealership: stateData.dealershipId,
            userRole: userContext.role
          })
        }
      }
      
      // Determine current dealership based on user context
      const currentDealership = await this.determineCurrentDealership(userContext)
      
      return {
        dealershipId: currentDealership.dealershipId,
        isValid: currentDealership.isValid,
        reason: currentDealership.reason,
        fallbackDealership: currentDealership.fallbackDealership
      }
      
    } catch (error) {
      logger.error('Error resolving dealership for OAuth callback', error, { userId })
      return {
        dealershipId: null,
        isValid: false,
        reason: 'Internal error during dealership resolution'
      }
    }
  }
  
  /**
   * Get user context needed for dealership resolution
   */
  async getUserContext(userId: string): Promise<UserDealershipContext | null> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dealershipId: true,
        currentDealershipId: true,
        agencyId: true,
        role: true
      }
    })
    
    if (!user) return null
    
    return {
      userId: user.id,
      userDealershipId: user.dealershipId,
      userCurrentDealershipId: user.currentDealershipId,
      agencyId: user.agencyId,
      role: user.role
    }
  }
  
  /**
   * Determine current dealership based on user context with fallback logic
   */
  private async determineCurrentDealership(userContext: UserDealershipContext): Promise<DealershipResolutionResult> {
    const { userId, userDealershipId, userCurrentDealershipId, agencyId, role } = userContext
    
    // Priority 1: Current dealership (if valid)
    if (userCurrentDealershipId) {
      const hasAccess = await this.validateDealershipAccess(userContext, userCurrentDealershipId)
      if (hasAccess) {
        return {
          dealershipId: userCurrentDealershipId,
          isValid: true
        }
      }
    }
    
    // Priority 2: User's primary dealership (if valid)
    if (userDealershipId) {
      const hasAccess = await this.validateDealershipAccess(userContext, userDealershipId)
      if (hasAccess) {
        return {
          dealershipId: userDealershipId,
          isValid: true
        }
      }
    }
    
    // Priority 3: Find accessible dealership for agency users
    if (agencyId && (role === 'AGENCY_ADMIN' || role === 'SUPER_ADMIN')) {
      const accessibleDealership = await prisma.dealerships.findFirst({
        where: { agencyId },
        select: { id: true },
        orderBy: { createdAt: 'asc' }
      })
      
      if (accessibleDealership) {
        return {
          dealershipId: accessibleDealership.id,
          isValid: true,
          reason: 'Using first accessible dealership from user\'s agency'
        }
      }
    }
    
    // Priority 4: Super admin can create connection without dealership
    if (role === 'SUPER_ADMIN') {
      return {
        dealershipId: null,
        isValid: true,
        reason: 'Super admin connection without specific dealership'
      }
    }
    
    return {
      dealershipId: null,
      isValid: false,
      reason: 'No accessible dealership found for user'
    }
  }
  
  /**
   * Validate that user has access to specified dealership
   */
  async validateDealershipAccess(userContext: UserDealershipContext, dealershipId: string): Promise<boolean> {
    const { userId, agencyId, role } = userContext
    
    // Super admins have access to all dealerships
    if (role === 'SUPER_ADMIN') return true
    
    // Check if dealership exists
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      select: { id: true, agencyId: true }
    })
    
    if (!dealership) return false
    
    // Check agency access for agency admins
    if ((role === 'AGENCY_ADMIN' || role === 'AGENCY_USER') && agencyId) {
      return dealership.agencyId === agencyId
    }
    
    // Check direct user access through user_dealership_access
    const access = await prisma.user_dealership_access.findFirst({
      where: {
        userId,
        dealershipId
      }
    })
    
    return !!access
  }
  
  /**
   * Prepare state data for OAuth initiation to preserve dealership context
   * Uses HMAC-SHA256 signing for cryptographic security
   */
  prepareOAuthState(userId: string, currentDealershipId?: string): string {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided for OAuth state')
    }
    
    if (currentDealershipId && typeof currentDealershipId !== 'string') {
      throw new Error('Invalid dealershipId provided for OAuth state')
    }
    
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET is required for OAuth state signing')
    }
    
    const stateData = {
      userId,
      dealershipId: currentDealershipId,
      timestamp: Date.now()
    }
    
    // Create payload and sign with HMAC-SHA256
    const payloadBase64 = Buffer.from(JSON.stringify(stateData)).toString('base64')
    const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('hex')
    
    // Format: base64_payload.hmac_signature
    return `${payloadBase64}.${signature}`
  }
  
  /**
   * Parse state data from OAuth callback
   * Validates HMAC-SHA256 signature and timestamp
   */
  parseOAuthState(state: string): { userId: string; dealershipId?: string; timestamp?: number } | null {
    if (!state || typeof state !== 'string') {
      logger.error('Invalid OAuth state parameter: empty or non-string')
      return null
    }
    
    try {
      // Handle legacy state format (just userId) - SECURITY: Only for backward compatibility
      if (!state.includes('.') && !state.includes('{')) {
        logger.warn('Using legacy OAuth state format - security upgrade recommended', { stateLength: state.length })
        // Basic validation for userId format (should be UUID or similar)
        if (!/^[a-zA-Z0-9-_]{8,}$/.test(state)) {
          logger.error('Invalid legacy OAuth state format')
          return null
        }
        return { userId: state }
      }
      
      // Handle signed state format: payload.signature
      if (state.includes('.')) {
        return this.parseSignedOAuthState(state)
      }
      
      // Handle old JSON state format (Base64 encoded)
      const decoded = Buffer.from(state, 'base64').toString('utf-8')
      const stateData = JSON.parse(decoded)
      
      // Validate required fields
      if (!stateData.userId || typeof stateData.userId !== 'string') {
        logger.error('Invalid OAuth state: missing or invalid userId')
        return null
      }
      
      return stateData
    } catch (error) {
      logger.error('Failed to parse OAuth state', { error: error instanceof Error ? error.message : 'Unknown error', statePreview: state.substring(0, 20) })
      return null
    }
  }
  
  /**
   * Parse and verify signed OAuth state
   * @private
   */
  private parseSignedOAuthState(state: string): { userId: string; dealershipId?: string; timestamp?: number } | null {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      logger.error('NEXTAUTH_SECRET is required for OAuth state verification')
      return null
    }
    
    const parts = state.split('.')
    if (parts.length !== 2) {
      logger.error('Invalid signed OAuth state format: expected payload.signature')
      return null
    }
    
    const [payloadBase64, providedSignature] = parts
    
    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('hex')
    
    // Use timing-safe comparison to prevent timing attacks
    // First check if lengths match (timing-safe comparison requires equal length)
    if (providedSignature.length !== expectedSignature.length) {
      logger.error('OAuth state signature verification failed - length mismatch')
      return null
    }
    
    if (!crypto.timingSafeEqual(Buffer.from(providedSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      logger.error('OAuth state signature verification failed')
      return null
    }
    
    // Decode and parse payload
    let stateData
    try {
      const decoded = Buffer.from(payloadBase64, 'base64').toString('utf-8')
      stateData = JSON.parse(decoded)
    } catch (error) {
      logger.error('Failed to decode OAuth state payload', { error: error instanceof Error ? error.message : 'Unknown error' })
      return null
    }
    
    // Validate timestamp (max age: 10 minutes)
    if (stateData.timestamp) {
      const maxAge = 10 * 60 * 1000 // 10 minutes in milliseconds
      const now = Date.now()
      const age = now - stateData.timestamp
      
      if (age > maxAge || age < 0) {
        logger.error('OAuth state timestamp validation failed', { 
          age: Math.round(age / 1000), 
          maxAgeSeconds: Math.round(maxAge / 1000),
          isExpired: age > maxAge,
          isFuture: age < 0
        })
        return null
      }
    }
    
    // Validate required fields
    if (!stateData.userId || typeof stateData.userId !== 'string') {
      logger.error('Invalid OAuth state: missing or invalid userId')
      return null
    }
    
    if (stateData.dealershipId && typeof stateData.dealershipId !== 'string') {
      logger.error('Invalid OAuth state: invalid dealershipId type')
      return null
    }
    
    return stateData
  }
  
  /**
   * Clean up orphaned connections that have invalid dealership associations
   * Uses database transactions for consistency
   */
  async cleanupOrphanedConnections(userId: string): Promise<void> {
    logger.info('🧹 Cleaning up orphaned connections', { userId })
    
    // Validate userId input
    if (!userId || typeof userId !== 'string') {
      logger.error('Invalid userId provided for cleanup')
      return
    }
    
    try {
      const userContext = await this.getUserContext(userId)
      if (!userContext) {
        logger.warn('User context not found for cleanup', { userId })
        return
      }
      
      // Use transaction for consistent cleanup
      await prisma.$transaction(async (tx) => {
        // Find connections with dealershipIds that user no longer has access to
        const [ga4Connections, scConnections] = await Promise.all([
          tx.ga4_connections.findMany({
            where: { userId },
            select: { id: true, dealershipId: true }
          }),
          tx.search_console_connections.findMany({
            where: { userId },
            select: { id: true, dealershipId: true }
          })
        ])
        
        const invalidGA4Connections = []
        const invalidSCConnections = []
        
        // Validate each connection's dealership access
        for (const conn of ga4Connections) {
          if (conn.dealershipId && !(await this.validateDealershipAccess(userContext, conn.dealershipId))) {
            invalidGA4Connections.push(conn.id)
            logger.warn('Found GA4 connection with invalid dealership access', {
              userId,
              connectionId: conn.id,
              dealershipId: conn.dealershipId
            })
          }
        }
        
        for (const conn of scConnections) {
          if (conn.dealershipId && !(await this.validateDealershipAccess(userContext, conn.dealershipId))) {
            invalidSCConnections.push(conn.id)
            logger.warn('Found Search Console connection with invalid dealership access', {
              userId,
              connectionId: conn.id,
              dealershipId: conn.dealershipId
            })
          }
        }
        
        // Remove invalid connections in batches
        if (invalidGA4Connections.length > 0) {
          await tx.ga4_connections.deleteMany({
            where: { id: { in: invalidGA4Connections } }
          })
          logger.info(`Removed ${invalidGA4Connections.length} invalid GA4 connections`, { userId })
        }
        
        if (invalidSCConnections.length > 0) {
          await tx.search_console_connections.deleteMany({
            where: { id: { in: invalidSCConnections } }
          })
          logger.info(`Removed ${invalidSCConnections.length} invalid Search Console connections`, { userId })
        }
      })
      
    } catch (error) {
      logger.error('Error cleaning up orphaned connections', error, { userId })
      throw error // Re-throw to allow caller to handle transaction failures
    }
  }
}

// Export singleton instance
export const oauthDealershipResolver = new OAuthDealershipResolver()