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

// Export request validation schemas
export { createRequestSchema, updateRequestSchema, type CreateRequestInput, type UpdateRequestInput } from './request'

// Export settings validation schemas
export { 
  updateProfileSchema,
  notificationPreferencesSchema,
  regenerateApiKeySchema,
  userPreferencesSchema,
  type UpdateProfileInput,
  type NotificationPreferencesInput,
  type UserPreferencesInput
} from './settings'

// Validation helper function
export async function validateRequest<T>(request: Request, schema: any): Promise<{ success: boolean; data?: T; error?: any }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    return result
  } catch (error) {
    return { success: false, error }
  }
}
