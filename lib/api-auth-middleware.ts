import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth, SimpleSession } from './auth-simple'
import { logger, getSafeErrorMessage } from './logger'
import { apiMonitor } from './api-monitor'
import { Buffer } from 'buffer'

export interface AuthenticatedRequest extends NextRequest {
  user: SimpleSession['user']
  session: SimpleSession
}

export interface ApiError {
  error: string
  code?: string
  details?: any
}

// Standard error responses
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message, code: 'FORBIDDEN' },
    { status: 403 }
  )
}

export function badRequestResponse(message: string, details?: any): NextResponse {
  return NextResponse.json(
    { error: message, code: 'BAD_REQUEST', details },
    { status: 400 }
  )
}

export function internalErrorResponse(message: string = 'Internal server error'): NextResponse {
  return NextResponse.json(
    { error: message, code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

// Middleware to require authentication
export function requireAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    let response: NextResponse
    let statusCode = 200

    try {
      // Get session from request
      const session = await SimpleAuth.getSessionFromRequest(req)

      if (!session) {
        logger.warn('Authentication required but no session found', {
          path: req.nextUrl.pathname,
          method: req.method,
          userAgent: req.headers.get('user-agent')
        })
        response = unauthorizedResponse('Authentication required')
        statusCode = 401
      } else {
        // Add user and session to request
        const authenticatedReq = req as AuthenticatedRequest
        authenticatedReq.user = session.user
        authenticatedReq.session = session

        response = await handler(authenticatedReq)
        statusCode = response.status
      }
    } catch (error) {
      logger.error('Authentication middleware error', error, {
        path: req.nextUrl.pathname,
        method: req.method
      })
      response = internalErrorResponse()
      statusCode = 500
    }

    // Log API call
    const responseTime = Date.now() - startTime
    apiMonitor.logRequest({
      path: req.nextUrl.pathname,
      method: req.method,
      statusCode,
      responseTime,
      userId: (req as AuthenticatedRequest).user?.id,
      userAgent: req.headers.get('user-agent') || undefined
    })

    return response
  }
}

// Middleware to require specific roles
export function requireRole(allowedRoles: string[]) {
  return function(
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ) {
    return requireAuth(async (req: AuthenticatedRequest): Promise<NextResponse> => {
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Role access denied', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.nextUrl.pathname,
          method: req.method
        })
        return forbiddenResponse(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`)
      }

      return handler(req)
    })
  }
}

// Middleware for admin-only endpoints
export function requireAdmin(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return requireRole(['ADMIN', 'SUPER_ADMIN'])(handler)
}

// Middleware for super admin-only endpoints
export function requireSuperAdmin(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return requireRole(['SUPER_ADMIN'])(handler)
}

// Middleware for agency admin endpoints
export function requireAgencyAdmin(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return requireRole(['AGENCY_ADMIN', 'ADMIN', 'SUPER_ADMIN'])(handler)
}

// Middleware to verify API key for webhooks and external integrations
export function requireApiKey(expectedKeyEnvVar: string) {
  return function(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now()
      let response: NextResponse
      let statusCode = 200

      try {
        const apiKey = req.headers.get('x-api-key')
        const expectedKey = process.env[expectedKeyEnvVar]

        if (!apiKey || !expectedKey) {
          logger.warn('API key authentication failed - missing key', {
            hasApiKey: !!apiKey,
            hasExpectedKey: !!expectedKey,
            envVar: expectedKeyEnvVar,
            path: req.nextUrl.pathname,
            method: req.method
          })
          response = unauthorizedResponse('Invalid API key')
          statusCode = 401
        } else if (!await timingSafeCompare(apiKey, expectedKey)) {
          logger.warn('API key authentication failed - invalid key', {
            envVar: expectedKeyEnvVar,
            path: req.nextUrl.pathname,
            method: req.method
          })
          response = unauthorizedResponse('Invalid API key')
          statusCode = 401
        } else {
          response = await handler(req)
          statusCode = response.status
        }
      } catch (error) {
        logger.error('API key middleware error', error, {
          path: req.nextUrl.pathname,
          method: req.method
        })
        response = internalErrorResponse()
        statusCode = 500
      }

      // Log API call
      const responseTime = Date.now() - startTime
      apiMonitor.logRequest({
        path: req.nextUrl.pathname,
        method: req.method,
        statusCode,
        responseTime,
        userAgent: req.headers.get('user-agent') || undefined
      })

      return response
    }
  }
}

// Timing-safe comparison for API keys
async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false
  }
  
  // Use crypto.timingSafeEqual if available, otherwise fallback
  try {
    const crypto = await import('crypto')
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    // Fallback for edge runtime
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}

// Middleware for request validation with Zod schemas
export function validateRequest<T>(schema: any) {
  return function(
    handler: (req: NextRequest, data: T) => Promise<NextResponse>
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        let data: any

        // Parse JSON body for POST, PUT, PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          const body = await req.json()
          data = body
        } else {
          // For GET requests, parse query parameters
          const url = new URL(req.url)
          data = Object.fromEntries(url.searchParams)
        }

        // Validate with schema
        const validation = schema.safeParse(data)
        if (!validation.success) {
          logger.warn('Request validation failed', {
            path: req.nextUrl.pathname,
            method: req.method,
            errors: validation.error.errors
          })
          return badRequestResponse(
            'Invalid request data',
            validation.error.errors
          )
        }

        return handler(req, validation.data)
      } catch (error) {
        logger.error('Request validation middleware error', error, {
          path: req.nextUrl.pathname,
          method: req.method
        })
        return badRequestResponse('Invalid request format')
      }
    }
  }
}

// Middleware for rate limiting (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return function(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const ip = req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || 
                'unknown'
      
      const now = Date.now()
      const key = `${ip}:${req.nextUrl.pathname}`
      
      const current = rateLimitMap.get(key)
      
      if (!current || now > current.resetTime) {
        // Reset or initialize
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
      } else if (current.count >= maxRequests) {
        // Rate limit exceeded
        logger.warn('Rate limit exceeded', {
          ip,
          path: req.nextUrl.pathname,
          method: req.method,
          count: current.count,
          maxRequests
        })
        return NextResponse.json(
          { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
          { status: 429 }
        )
      } else {
        // Increment count
        current.count++
      }
      
      return handler(req)
    }
  }
}

// Composite middleware that combines multiple middlewares
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}

// Example usage helpers
export const withAuth = requireAuth
export const withAdminAuth = requireAdmin
export const withSuperAdminAuth = requireSuperAdmin
export const withAgencyAdminAuth = requireAgencyAdmin
export const withApiKey = requireApiKey
export const withValidation = validateRequest
export const withRateLimit = rateLimit