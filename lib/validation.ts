import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

// Input validation schemas
export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url'
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  enum?: string[]
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

// Validate request body against schema
export function validateRequestBody(
  body: any,
  schema: ValidationSchema
): { valid: boolean; errors: string[]; sanitized?: any } {
  const errors: string[] = []
  const sanitized: any = {}

  for (const [field, rule] of Object.entries(schema)) {
    const value = body[field]

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`)
      continue
    }

    // Skip validation for optional empty fields
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Field '${field}' must be a string`)
            continue
          }
          break
        case 'number':
          if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
            errors.push(`Field '${field}' must be a number`)
            continue
          }
          sanitized[field] = Number(value)
          break
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${field}' must be a boolean`)
            continue
          }
          break
        case 'email':
          if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`Field '${field}' must be a valid email`)
            continue
          }
          break
        case 'url':
          try {
            new URL(value)
          } catch {
            errors.push(`Field '${field}' must be a valid URL`)
            continue
          }
          break
      }
    }

    // Length validation for strings
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`Field '${field}' must be at least ${rule.minLength} characters`)
        continue
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`Field '${field}' must be no more than ${rule.maxLength} characters`)
        continue
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(`Field '${field}' format is invalid`)
      continue
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`Field '${field}' must be one of: ${rule.enum.join(', ')}`)
      continue
    }

    // Sanitize strings (remove dangerous characters)
    if (typeof value === 'string') {
      sanitized[field] = sanitizeString(value)
    } else {
      sanitized[field] = value
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  }
}

// Sanitize string input
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
    .substring(0, 1000) // Limit length
}

// Validation middleware wrapper
export function withValidation(schema: ValidationSchema) {
  return function(
    handler: (req: NextRequest, body: any) => Promise<NextResponse>
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const body = await req.json()
        const validation = validateRequestBody(body, schema)

        if (!validation.valid) {
          logger.warn('Request validation failed', {
            errors: validation.errors,
            path: req.nextUrl.pathname
          })
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Validation failed',
              details: validation.errors
            },
            { status: 400 }
          )
        }

        return handler(req, validation.sanitized)
      } catch (error) {
        logger.error('Request validation error', error)
        return NextResponse.json(
          { success: false, error: 'Invalid request format' },
          { status: 400 }
        )
      }
    }
  }
}

// Common validation schemas
export const CommonSchemas = {
  email: {
    email: { required: true, type: 'email' as const }
  },
  dealershipSwitch: {
    dealershipId: { required: true, type: 'string' as const, pattern: /^[a-zA-Z0-9-_]+$/ }
  },
  contentRequest: {
    title: { required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
    type: { required: true, enum: ['page', 'blog', 'gbp_post', 'improvement', 'seochange'] },
    dealershipId: { required: true, type: 'string' as const }
  }
}
