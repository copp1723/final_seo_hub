/**
 * Connection Integrity Validator
 * 
 * Service to validate and maintain the integrity of OAuth connections
 * across dealership assignments and user access changes.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { oauthDealershipResolver } from './oauth-dealership-resolver'

export interface ConnectionIntegrityReport {
  totalConnections: number
  validConnections: number
  invalidConnections: number
  orphanedConnections: number
  cleanedUpConnections: number
  issues: ConnectionIssue[]
}

export interface ConnectionIssue {
  type: 'orphaned' | 'invalid_dealership' | 'user_no_access' | 'duplicate'
  connectionType: 'ga4' | 'search_console'
  connectionId: string
  userId: string
  dealershipId: string | null
  reason: string
  resolved: boolean
}

export class ConnectionIntegrityValidator {
  
  /**
   * Run comprehensive connection integrity check
   */
  async validateAllConnections(autoFix: boolean = false): Promise<ConnectionIntegrityReport> {
    logger.info('🔍 Starting connection integrity validation', { autoFix })
    
    const report: ConnectionIntegrityReport = {
      totalConnections: 0,
      validConnections: 0,
      invalidConnections: 0,
      orphanedConnections: 0,
      cleanedUpConnections: 0,
      issues: []
    }
    
    try {
      // Validate GA4 connections
      const ga4Report = await this.validateGA4Connections(autoFix)
      this.mergeReports(report, ga4Report)
      
      // Validate Search Console connections
      const scReport = await this.validateSearchConsoleConnections(autoFix)
      this.mergeReports(report, scReport)
      
      // Check for duplicates
      const duplicateReport = await this.validateDuplicateConnections(autoFix)
      this.mergeReports(report, duplicateReport)
      
      logger.info('✅ Connection integrity validation completed', {
        totalConnections: report.totalConnections,
        validConnections: report.validConnections,
        invalidConnections: report.invalidConnections,
        cleanedUpConnections: report.cleanedUpConnections
      })
      
    } catch (error) {
      logger.error('❌ Connection integrity validation failed', error)
      throw error
    }
    
    return report
  }
  
  /**
   * Validate GA4 connections
   */
  private async validateGA4Connections(autoFix: boolean): Promise<ConnectionIntegrityReport> {
    const connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        accessToken: true,
        propertyId: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            role: true,
            agencyId: true,
            dealershipId: true
          }
        }
      }
    })
    
    const report: ConnectionIntegrityReport = {
      totalConnections: connections.length,
      validConnections: 0,
      invalidConnections: 0,
      orphanedConnections: 0,
      cleanedUpConnections: 0,
      issues: []
    }
    
    for (const conn of connections) {
      const issues = await this.validateConnection(conn, 'ga4')
      
      if (issues.length === 0) {
        report.validConnections++
      } else {
        report.invalidConnections++
        report.issues.push(...issues)
        
        // Auto-fix if enabled
        if (autoFix) {
          const resolved = await this.resolveConnectionIssues(conn.id, 'ga4', issues)
          if (resolved) {
            report.cleanedUpConnections++
            issues.forEach(issue => issue.resolved = true)
          }
        }
      }
    }
    
    return report
  }
  
  /**
   * Validate Search Console connections
   */
  private async validateSearchConsoleConnections(autoFix: boolean): Promise<ConnectionIntegrityReport> {
    const connections = await prisma.search_console_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        accessToken: true,
        siteUrl: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            role: true,
            agencyId: true,
            dealershipId: true
          }
        }
      }
    })
    
    const report: ConnectionIntegrityReport = {
      totalConnections: connections.length,
      validConnections: 0,
      invalidConnections: 0,
      orphanedConnections: 0,
      cleanedUpConnections: 0,
      issues: []
    }
    
    for (const conn of connections) {
      const issues = await this.validateConnection(conn, 'search_console')
      
      if (issues.length === 0) {
        report.validConnections++
      } else {
        report.invalidConnections++
        report.issues.push(...issues)
        
        // Auto-fix if enabled
        if (autoFix) {
          const resolved = await this.resolveConnectionIssues(conn.id, 'search_console', issues)
          if (resolved) {
            report.cleanedUpConnections++
            issues.forEach(issue => issue.resolved = true)
          }
        }
      }
    }
    
    return report
  }
  
  /**
   * Validate individual connection
   */
  private async validateConnection(
    connection: any,
    type: 'ga4' | 'search_console'
  ): Promise<ConnectionIssue[]> {
    const issues: ConnectionIssue[] = []
    
    // Check for orphaned connections (user doesn't exist)
    if (!connection.users) {
      issues.push({
        type: 'orphaned',
        connectionType: type,
        connectionId: connection.id,
        userId: connection.userId,
        dealershipId: connection.dealershipId,
        reason: 'User no longer exists',
        resolved: false
      })
      return issues
    }
    
    // Check for invalid dealership access
    if (connection.dealershipId) {
      const hasAccess = await oauthDealershipResolver.validateDealershipAccess(
        {
          userId: connection.userId,
          userDealershipId: connection.users.dealershipId,
          userCurrentDealershipId: null, // Not available in this context
          agencyId: connection.users.agencyId,
          role: connection.users.role
        },
        connection.dealershipId
      )
      
      if (!hasAccess) {
        issues.push({
          type: 'user_no_access',
          connectionType: type,
          connectionId: connection.id,
          userId: connection.userId,
          dealershipId: connection.dealershipId,
          reason: 'User no longer has access to associated dealership',
          resolved: false
        })
      }
    }
    
    // Check for missing essential data
    const hasEssentialData = type === 'ga4' 
      ? connection.accessToken && connection.propertyId
      : connection.accessToken && connection.siteUrl
    
    if (!hasEssentialData) {
      issues.push({
        type: 'invalid_dealership',
        connectionType: type,
        connectionId: connection.id,
        userId: connection.userId,
        dealershipId: connection.dealershipId,
        reason: `Missing essential ${type} connection data`,
        resolved: false
      })
    }
    
    return issues
  }
  
  /**
   * Check for duplicate connections
   */
  private async validateDuplicateConnections(autoFix: boolean): Promise<ConnectionIntegrityReport> {
    const report: ConnectionIntegrityReport = {
      totalConnections: 0,
      validConnections: 0,
      invalidConnections: 0,
      orphanedConnections: 0,
      cleanedUpConnections: 0,
      issues: []
    }
    
    // Find GA4 duplicates
    const ga4Duplicates = await prisma.ga4_connections.groupBy({
      by: ['userId', 'dealershipId'],
      having: {
        userId: {
          _count: {
            gt: 1
          }
        }
      },
      _count: true
    })
    
    for (const duplicate of ga4Duplicates) {
      const connections = await prisma.ga4_connections.findMany({
        where: {
          userId: duplicate.userId,
          dealershipId: duplicate.dealershipId
        },
        orderBy: { updatedAt: 'desc' }
      })
      
      // Keep the most recent, mark others as duplicates
      for (let i = 1; i < connections.length; i++) {
        const conn = connections[i]
        report.issues.push({
          type: 'duplicate',
          connectionType: 'ga4',
          connectionId: conn.id,
          userId: conn.userId,
          dealershipId: conn.dealershipId,
          reason: 'Duplicate GA4 connection for same user-dealership pair',
          resolved: false
        })
        
        if (autoFix) {
          await prisma.ga4_connections.delete({ where: { id: conn.id } })
          report.cleanedUpConnections++
          report.issues[report.issues.length - 1].resolved = true
        }
      }
    }
    
    // Find Search Console duplicates
    const scDuplicates = await prisma.search_console_connections.groupBy({
      by: ['userId', 'dealershipId'],
      having: {
        userId: {
          _count: {
            gt: 1
          }
        }
      },
      _count: true
    })
    
    for (const duplicate of scDuplicates) {
      const connections = await prisma.search_console_connections.findMany({
        where: {
          userId: duplicate.userId,
          dealershipId: duplicate.dealershipId
        },
        orderBy: { updatedAt: 'desc' }
      })
      
      // Keep the most recent, mark others as duplicates
      for (let i = 1; i < connections.length; i++) {
        const conn = connections[i]
        report.issues.push({
          type: 'duplicate',
          connectionType: 'search_console',
          connectionId: conn.id,
          userId: conn.userId,
          dealershipId: conn.dealershipId,
          reason: 'Duplicate Search Console connection for same user-dealership pair',
          resolved: false
        })
        
        if (autoFix) {
          await prisma.search_console_connections.delete({ where: { id: conn.id } })
          report.cleanedUpConnections++
          report.issues[report.issues.length - 1].resolved = true
        }
      }
    }
    
    return report
  }
  
  /**
   * Resolve connection issues
   */
  private async resolveConnectionIssues(
    connectionId: string,
    type: 'ga4' | 'search_console',
    issues: ConnectionIssue[]
  ): Promise<boolean> {
    try {
      // For orphaned connections or connections with no access, delete them
      const shouldDelete = issues.some(issue => 
        issue.type === 'orphaned' || 
        issue.type === 'user_no_access' ||
        issue.type === 'invalid_dealership'
      )
      
      if (shouldDelete) {
        if (type === 'ga4') {
          await prisma.ga4_connections.delete({ where: { id: connectionId } })
        } else {
          await prisma.search_console_connections.delete({ where: { id: connectionId } })
        }
        
        logger.info('🧹 Deleted invalid connection', { connectionId, type, issues: issues.map(i => i.type) })
        return true
      }
      
      return false
    } catch (error) {
      logger.error('❌ Failed to resolve connection issues', { connectionId, type, error })
      return false
    }
  }
  
  /**
   * Merge reports
   */
  private mergeReports(main: ConnectionIntegrityReport, additional: ConnectionIntegrityReport) {
    main.totalConnections += additional.totalConnections
    main.validConnections += additional.validConnections
    main.invalidConnections += additional.invalidConnections
    main.orphanedConnections += additional.orphanedConnections
    main.cleanedUpConnections += additional.cleanedUpConnections
    main.issues.push(...additional.issues)
  }
  
  /**
   * Validate connections for a specific user
   */
  async validateUserConnections(userId: string, autoFix: boolean = false): Promise<ConnectionIntegrityReport> {
    logger.info('🔍 Validating connections for user', { userId, autoFix })
    
    // Clean up orphaned connections using the resolver
    await oauthDealershipResolver.cleanupOrphanedConnections(userId)
    
    // Run full validation but filter by user
    const fullReport = await this.validateAllConnections(autoFix)
    
    // Filter issues for this user
    const userIssues = fullReport.issues.filter(issue => issue.userId === userId)
    
    return {
      ...fullReport,
      issues: userIssues,
      invalidConnections: userIssues.length,
      validConnections: fullReport.totalConnections - userIssues.length
    }
  }
}

// Export singleton instance
export const connectionIntegrityValidator = new ConnectionIntegrityValidator()