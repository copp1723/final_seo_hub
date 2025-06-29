import { sanitizeForLog } from './validations'

export interface LogContext {
  userId?: string
  path?: string
  method?: string
  [key: string]: any
}

export class Logger {
  private static instance: Logger
  private isDevelopment = process.env.NODE_ENV === 'development'
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }
  
  /**
   * Log error with sanitized message
   */
  error(message: string, error?: unknown, context?: LogContext) {
    const sanitizedMessage = sanitizeForLog(message)
    const errorDetails = this.getErrorDetails(error)
    
    if (this.isDevelopment) {
      console.error(sanitizedMessage, {
        ...errorDetails,
        context
      })
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring('error', sanitizedMessage, {
        ...errorDetails,
        context
      })
    }
  }
  
  /**
   * Log warning with sanitized message
   */
  warn(message: string, context?: LogContext) {
    const sanitizedMessage = sanitizeForLog(message)
    
    if (this.isDevelopment) {
      console.warn(sanitizedMessage, context)
    } else {
      this.sendToMonitoring('warn', sanitizedMessage, context)
    }
  }
  
  /**
   * Log info with sanitized message
   */
  info(message: string, context?: LogContext) {
    const sanitizedMessage = sanitizeForLog(message)
    
    if (this.isDevelopment) {
      console.log(sanitizedMessage, context)
    } else {
      this.sendToMonitoring('info', sanitizedMessage, context)
    }
  }
  
  /**
   * Extract safe error details
   */
  private getErrorDetails(error: unknown): Record<string, any> {
    if (!error) return {}
    
    if (error instanceof Error) {
      // Don't expose stack traces in production
      const details: Record<string, any> = {
        name: error.name,
        message: sanitizeForLog(error.message)
      }
      
      if (this.isDevelopment) {
        details.stack = error.stack
      }
      
      return details
    }
    
    // For non-Error objects, sanitize the string representation
    return {
      error: sanitizeForLog(String(error))
    }
  }
  
  /**
   * Send logs to monitoring service (to be implemented)
   */
  private sendToMonitoring(
    level: 'error' | 'warn' | 'info',
    message: string,
    context?: any
  ) {
    // TODO: Implement sending to monitoring service
    // For now, use console as fallback
    console[level](`[${level.toUpperCase()}]`, message, context)
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

/**
 * Get safe error message for API responses
 */
export function getSafeErrorMessage(error: unknown): string {
  // Never expose internal error details to users
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please try again later.'
  }
  
  // In development, provide more context
  if (error instanceof Error) {
    // Still sanitize in development to catch issues early
    return sanitizeForLog(error.message, 500)
  }
  
  return 'An unexpected error occurred.'
}