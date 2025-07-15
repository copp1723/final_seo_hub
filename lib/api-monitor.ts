import { logger } from './logger'

interface ApiMetrics {
  path: string
  method: string
  statusCode: number
  responseTime: number
  userId?: string
  userAgent?: string
}

class ApiMonitor {
  private static instance: ApiMonitor
  private slowThreshold = parseInt(process.env.API_SLOW_THRESHOLD_MS || '1000')
  
  private constructor() {}
  
  static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor()
    }
    return ApiMonitor.instance
  }
  
  logRequest(metrics: ApiMetrics) {
    const { path, method, statusCode, responseTime, userId, userAgent } = metrics
    
    const logData = {
      path,
      method,
      statusCode,
      responseTime,
      userId,
      userAgent: userAgent?.substring(0, 100) // Truncate user agent
    }
    
    // Log slow requests as warnings
    if (responseTime > this.slowThreshold) {
      logger.warn(`Slow API response: ${method} ${path} took ${responseTime}ms`, logData)
    }
    
    // Log errors
    if (statusCode >= 400) {
      logger.error(`API error: ${method} ${path} returned ${statusCode}`, undefined, logData)
    } else {
      // Log successful requests in development only
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API: ${method} ${path} - ${statusCode} (${responseTime}ms)`, logData)
      }
    }
  }
}

export const apiMonitor = ApiMonitor.getInstance()