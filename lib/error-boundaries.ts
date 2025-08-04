import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

// API wrapper with error boundaries and graceful degradation
export function withErrorBoundary<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  fallbackData?: any
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      logger.error('API handler error caught by boundary', error)
      
      // Return fallback data if available
      if (fallbackData) {
        return NextResponse.json({
          success: true,
          data: fallbackData,
          fallback: true,
          message: 'Using fallback data due to service unavailability'
        })
      }
      
      // Generic error response
      return NextResponse.json(
        { 
          success: false, 
          error: 'Service temporarily unavailable' 
        },
        { status: 503 }
      )
    }
  }
}

// Service availability checker
export class ServiceChecker {
  private static statusCache = new Map<string, { 
    healthy: boolean
    lastCheck: number 
  }>()
  
  static async isServiceHealthy(
    serviceName: string,
    checkFn: () => Promise<boolean>,
    cacheMs = 60000 // 1 minute cache
  ): Promise<boolean> {
    const cached = this.statusCache.get(serviceName)
    const now = Date.now()
    
    if (cached && now - cached.lastCheck < cacheMs) {
      return cached.healthy
    }
    
    try {
      const healthy = await checkFn()
      this.statusCache.set(serviceName, { healthy, lastCheck: now })
      return healthy
    } catch (error) {
      logger.warn(`Service health check failed: ${serviceName}`, { 
        serviceName,
        error: error instanceof Error ? error.message : String(error)
      })
      this.statusCache.set(serviceName, { healthy: false, lastCheck: now })
      return false
    }
  }
}

// Timeout wrapper for external API calls
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise])
}
