// Simple sanitization function for logging
export function sanitizeForLog(data: unknown): unknown {
  if (typeof data === 'string') {
    // Remove potential sensitive information
    return data.replace(/password|token|secret|key/gi, '[REDACTED]')
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof key === 'string' && /password|token|secret|key/i.test(key)) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeForLog(value)
      }
    }
    return sanitized
  }
  
  return data
}

// Export webhook validation schemas
export { seoworksWebhookSchema, type SEOWorksWebhookPayload } from './webhook'

// Validation helper function
export function validateRequest<T>(schema: any, data: unknown): { success: boolean; data?: T; error?: any } {
  try {
    const result = schema.safeParse(data)
    return result
  } catch (error) {
    return { success: false, error }
  }
}
