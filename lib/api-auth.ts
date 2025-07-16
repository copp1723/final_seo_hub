import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Standardized API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Create standardized error response
export function errorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json<ApiResponse>({ 
    success: false, 
    error 
  }, { status })
}

// Create standardized success response
export function successResponse<T>(data?: T, message?: string): NextResponse {
  return NextResponse.json<ApiResponse<T>>({ 
    success: true, 
    data,
    message 
  })
}

// Reusable auth check for API routes
export async function requireAuth(request?: NextRequest) {
  let session;
  
  // If request is provided, use getSessionFromRequest (for API routes)
  // Otherwise use getSession (for server components)
  if (request) {
    session = await SimpleAuth.getSessionFromRequest(request);
  } else {
    session = await SimpleAuth.getSession();
  }
  
  if (!session?.user.id) {
    return { 
      authenticated: false, 
      response: errorResponse('Unauthorized', 401) 
    }
  }
  
  return { 
    authenticated: true, 
    user: session.user
  }
}

// Timing-safe API key validation
export function validateApiKey(
  request: NextRequest, 
  envKey: string
): { valid: boolean; response?: NextResponse } {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env[envKey]
  
  if (!apiKey || !expectedKey) {
    return { 
      valid: false, 
      response: errorResponse('Unauthorized', 401) 
    }
  }
  
  const valid = crypto.timingSafeEqual(
    Buffer.from(apiKey),
    Buffer.from(expectedKey)
  )
  
  if (!valid) {
    logger.error('Failed API key validation', undefined, { envKey })
    return { 
      valid: false, 
      response: errorResponse('Unauthorized', 401) 
    }
  }
  
  return { valid: true }
}
