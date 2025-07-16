import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, ApiResponse } from './api-auth'
import { rateLimits } from './rate-limit'
import { logger, getSafeErrorMessage } from './logger'
import { z } from 'zod'

// Middleware options
export interface ApiMiddlewareOptions {
  auth?: boolean
  rateLimit?: keyof typeof rateLimits
  validateBody?: z.ZodSchema
  requireUserId?: boolean
}

// Create API handler with common middleware
export function createApiHandler<T = any>(
  handler: (req: NextRequest, context: {
    user?: any
    body?: T
    params?: any
  }) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) {
  return async (req: NextRequest, params?: any) => {
    try {
      // Apply rate limiting if specified
      if (options.rateLimit) {
        const rateLimitResponse = await rateLimits[options.rateLimit](req)
        if (rateLimitResponse) return rateLimitResponse
      }

      // Check authentication if required
      let user = null
      if (options.auth !== false) {
        const authResult = await requireAuth(req)
        if (!authResult.authenticated && authResult.response) {
          return authResult.response
        }
        user = authResult.user
      }

      // Validate request body if schema provided
      let body: T | undefined
      if (options.validateBody && req.method !== 'GET') {
        try {
          const rawBody = await req.json()
          body = options.validateBody.parse(rawBody) as T
        } catch (error) {
          if (error instanceof z.ZodError) {
            return errorResponse('Invalid request data', 400)
          }
          throw error
        }
      }

      // Call the handler with context
      return await handler(req, { user, body, params })
    } catch (error) {
      logger.error('API handler error', error, {
        method: req.method,
        url: req.url,
        userId: options.requireUserId ? 'unknown' : undefined
      })

      return errorResponse(
        getSafeErrorMessage(error) || 'An unexpected error occurred',
        500
      )
    }
  }
}

// Helper for GET endpoints
export const createGetHandler = (
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) => createApiHandler(handler, { ...options, auth: options.auth !== false })

// Helper for POST endpoints
export const createPostHandler = <T = any>(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: ApiMiddlewareOptions & { validateBody?: z.ZodSchema<T> } = {}
) => createApiHandler<T>(handler, { ...options, 
  auth: options.auth !== false,
  rateLimit: options.rateLimit || 'api'
})

// Helper for PUT endpoints
export const createPutHandler = <T = any>(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: ApiMiddlewareOptions & { validateBody?: z.ZodSchema<T> } = {}
) => createApiHandler<T>(handler, { ...options, 
  auth: options.auth !== false,
  rateLimit: options.rateLimit || 'api'
})

// Helper for DELETE endpoints
export const createDeleteHandler = (
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) => createApiHandler(handler, { ...options, 
  auth: options.auth !== false,
  rateLimit: options.rateLimit || 'api'
})
