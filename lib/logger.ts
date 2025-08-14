import { sanitizeForLog } from './validations/index'

export interface LogContext {
  userId?: string
  path?: string
  method?: string
  [key: string]: unknown
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
      console.error(sanitizedMessage, { ...errorDetails,
        context
      })
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring('error', String(sanitizedMessage), { ...errorDetails,
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
      this.sendToMonitoring('warn', String(sanitizedMessage), context)
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
      this.sendToMonitoring('info', String(sanitizedMessage), context)
    }
  }
  
  /**
   * Extract safe error details
   */
  private getErrorDetails(error: unknown): Record<string, unknown> {
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
   * Send logs to monitoring service
   */
  private sendToMonitoring(
    level: 'error' | 'warn' | 'info',
    message: string,
    context?: Record<string, unknown>
  ) {
    try {
      if (level === 'error') {
        // Use the original error if available, otherwise create a new one
        const error = context?.error instanceof Error
          ? context.error
          : new Error(message);

        // In production, you would send to a monitoring service
        // For now, just log to console
        console.error('[PRODUCTION ERROR]', message, {
          error: error.stack,
          ...context
        });
      } else {
        // Log warnings and info in production
        if (level === 'warn') {
          console.warn('[PRODUCTION WARNING]', message, context);
        } else {
          console.info('[PRODUCTION INFO]', message, context);
        }
      }
    } catch (sentryError) {
      // Fallback to console if Sentry fails
      console[level](`[${level.toUpperCase()}] Sentry failed:`, sentryError);
      console[level](`[${level.toUpperCase()}] Original:`, message, context);
    }
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
    return 'An error occurred.Please try again later.'
  }
  
  // In development, provide more context
  if (error instanceof Error) {
    // Still sanitize in development to catch issues early
    return String(sanitizeForLog(error.message))
  }
  
  return 'An unexpected error occurred.'
}
