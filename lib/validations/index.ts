import { z } from 'zod'
import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api-auth'

/**
 * Validates request body against a Zod schema
 * Returns validated data or error response
 */
type ValidationSuccess<T> = { success: true; data: T }
type ValidationError = { success: false; error: NextResponse }
type ValidationResult<T> = ValidationSuccess<T> | ValidationError

export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const validated = schema.safeParse(body)
    
    if (!validated.success) {
      const errors = validated.error.issues
      const message = errors
        .map(err => err.path.length > 0 ? `${err.path.join('.')}: ${err.message}` : err.message)
        .join('; ')
      
      return {
        success: false,
        error: errorResponse(message || 'Validation failed')
      }
    }
    
    return { success: true, data: validated.data }
  } catch (error) {
    return {
      success: false,
      error: errorResponse('Invalid JSON in request body')
    }
  }
}

// Export validation types
export type { ValidationSuccess, ValidationError, ValidationResult }

// Re-export all schemas
export * from './request'
export * from './webhook'
export * from './settings'
export * from './onboardingSchema'

// Sanitize string for logging (remove potential sensitive data)
export function sanitizeForLog(str: string, maxLength = 200): string {
  // Remove potential API keys, tokens, passwords
  const sanitized = str
    .replace(/\b(api[_-]?key|token|password|secret|auth|bearer)\s*[:=]\s*['"]?[\w-]+['"]?/gi, '[REDACTED]')
    .replace(/\b(sk-|pk-|api-|key-|token-|bearer\s+)[\w-]+/gi, '[REDACTED]')
    
  // Truncate if too long
  return sanitized.length > maxLength 
    ? sanitized.substring(0, maxLength) + '...' 
    : sanitized
}