/**
 * GA4 Data Integrity Validation
 * 
 * This module provides runtime validation to detect when GA4 data
 * becomes identical across different dealerships, which indicates
 * a critical bug in property selection logic.
 */

import { logger } from '@/lib/logger'
import { getGA4PropertyId } from '@/lib/dealership-property-mapping'

interface GA4DataPoint {
  dealershipId: string
  propertyId: string
  sessions: number
  users: number
  timestamp: number
}

// In-memory cache to track recent GA4 data points
const recentGA4Data = new Map<string, GA4DataPoint>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Validates that GA4 data is unique per dealership
 */
export function validateGA4DataIntegrity(
  dealershipId: string,
  propertyId: string,
  data: { sessions: number; users: number }
): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = []
  const now = Date.now()
  
  // Clean up old entries
  for (const [key, value] of recentGA4Data.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      recentGA4Data.delete(key)
    }
  }
  
  // Store current data point
  const currentDataPoint: GA4DataPoint = {
    dealershipId,
    propertyId,
    sessions: data.sessions,
    users: data.users,
    timestamp: now
  }
  recentGA4Data.set(dealershipId, currentDataPoint)
  
  // Check for identical data across different dealerships
  const identicalData = Array.from(recentGA4Data.values()).filter(point => 
    point.dealershipId !== dealershipId &&
    point.sessions === data.sessions &&
    point.users === data.users &&
    point.propertyId === propertyId // Same property ID is the smoking gun
  )
  
  if (identicalData.length > 0) {
    const affectedDealerships = identicalData.map(d => d.dealershipId).join(', ')
    warnings.push(`CRITICAL: Identical GA4 data detected across dealerships: ${dealershipId} and ${affectedDealerships}`)
    warnings.push(`All showing: ${data.sessions} sessions, ${data.users} users from property ${propertyId}`)
    
    logger.error('GA4 Data Integrity Violation', {
      currentDealership: dealershipId,
      affectedDealerships,
      propertyId,
      sessions: data.sessions,
      users: data.users,
      message: 'Multiple dealerships returning identical GA4 data - property selection logic may be broken'
    })
  }
  
  // Validate property ID matches expected mapping
  const expectedPropertyId = getGA4PropertyId(dealershipId)
  if (expectedPropertyId && expectedPropertyId !== propertyId) {
    warnings.push(`Property ID mismatch: Expected ${expectedPropertyId} for ${dealershipId}, got ${propertyId}`)
    
    logger.warn('GA4 Property ID Mismatch', {
      dealershipId,
      expectedPropertyId,
      actualPropertyId: propertyId,
      message: 'Dealership is not using its mapped property ID'
    })
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  }
}

/**
 * Middleware to validate GA4 responses before returning to client
 */
export function validateGA4Response(
  dealershipId: string | null,
  response: any
): any {
  if (!dealershipId || !response?.ga4Data || !response?.metadata?.propertyId) {
    return response
  }
  
  const validation = validateGA4DataIntegrity(
    dealershipId,
    response.metadata.propertyId,
    {
      sessions: response.ga4Data.sessions || 0,
      users: response.ga4Data.users || 0
    }
  )
  
  if (!validation.isValid) {
    // Add validation warnings to response for debugging
    response.metadata.validationWarnings = validation.warnings
    
    // Log critical issues
    validation.warnings.forEach(warning => {
      if (warning.includes('CRITICAL')) {
        logger.error('GA4 Data Integrity Check Failed', {
          dealershipId,
          propertyId: response.metadata.propertyId,
          warning,
          sessions: response.ga4Data.sessions,
          users: response.ga4Data.users
        })
      }
    })
  }
  
  return response
}

/**
 * Get current data integrity status for monitoring
 */
export function getDataIntegrityStatus(): {
  totalDealerships: number
  uniqueProperties: number
  suspiciousPatterns: Array<{
    propertyId: string
    dealerships: string[]
    dataPoint: { sessions: number; users: number }
  }>
} {
  const dataPoints = Array.from(recentGA4Data.values())
  const uniqueProperties = new Set(dataPoints.map(d => d.propertyId)).size
  
  // Group by property ID and data values to find suspicious patterns
  const groupedData = new Map<string, GA4DataPoint[]>()
  
  dataPoints.forEach(point => {
    const key = `${point.propertyId}-${point.sessions}-${point.users}`
    if (!groupedData.has(key)) {
      groupedData.set(key, [])
    }
    groupedData.get(key)!.push(point)
  })
  
  const suspiciousPatterns = Array.from(groupedData.entries())
    .filter(([_, points]) => points.length > 1) // Multiple dealerships with identical data
    .map(([key, points]) => {
      const [propertyId, sessions, users] = key.split('-')
      return {
        propertyId,
        dealerships: points.map(p => p.dealershipId),
        dataPoint: { sessions: parseInt(sessions), users: parseInt(users) }
      }
    })
  
  return {
    totalDealerships: dataPoints.length,
    uniqueProperties,
    suspiciousPatterns
  }
}
