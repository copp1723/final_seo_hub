import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth, SimpleSession } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Common response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

// Error response helper
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  logger.error(message, details)
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    },
    { status }
  )
}

// Success response helper
export function successResponse<T>(data: T, metadata?: any): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...metadata
  })
}

// Auth wrapper for routes
export async function withAuth<T>(
  request: NextRequest,
  handler: (session: SimpleSession, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session) {
      logger.error('Authentication required', { path: request.nextUrl.pathname })
      return errorResponse('Authentication required', 401)
    }
    
    return await handler(session, request)
  } catch (error) {
    logger.error('Route handler error', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      error
    )
  }
}

// Validation wrapper
export function withValidation<T>(
  schema: z.ZodSchema<T>
) {
  return async function(
    request: NextRequest,
    handler: (data: T, session: SimpleSession, request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (session, req) => {
      try {
        const body = await req.json()
        const validationResult = schema.safeParse(body)
        
        if (!validationResult.success) {
          return errorResponse(
            'Invalid request data',
            400,
            validationResult.error.errors
          )
        }
        
        return await handler(validationResult.data, session, req)
      } catch (error) {
        if (error instanceof SyntaxError) {
          return errorResponse('Invalid JSON in request body', 400)
        }
        throw error
      }
    })
  }
}

// Cache utility
export class RouteCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>()
  
  constructor(private ttlMs: number = 5 * 60 * 1000) {} // 5 minutes default
  
  get(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
    
    // Cleanup old entries if cache gets too large
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // Remove oldest 50 entries
      entries.slice(0, 50).forEach(([key]) => this.cache.delete(key))
    }
  }
  
  clear(): void {
    this.cache.clear()
  }
}
