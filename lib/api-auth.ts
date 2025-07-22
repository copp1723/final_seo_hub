// Legacy API auth functions - use api-auth-middleware.ts for new endpoints
import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Re-export from the new middleware for backward compatibility
export {
  successResponse,
  badRequestResponse as errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  internalErrorResponse
} from './api-auth-middleware'

// Legacy API response type - kept for backward compatibility
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Legacy success response - use successResponse from middleware instead
export function legacySuccessResponse<T>(data?: T, message?: string): NextResponse {
  return NextResponse.json<ApiResponse<T>>({ 
    success: true, 
    data,
    message 
  })
}

// Legacy error response - use standardized responses from middleware instead
export function legacyErrorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json<ApiResponse>({ 
    success: false, 
    error 
  }, { status })
}

// Legacy auth check - use requireAuth middleware instead
export async function requireAuth(request?: NextRequest) {
  if (!request) {
    return {
      authenticated: false,
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const session = await SimpleAuth.getSessionFromRequest(request)

  if (!session?.user.id) {
    return {
      authenticated: false,
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return {
    authenticated: true,
    user: session.user,
    response: null
  }
}

// Legacy API key validation - use requireApiKey middleware instead
export function validateApiKey(
  request: NextRequest, 
  envKey: string
): { valid: boolean; response?: NextResponse } {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env[envKey]
  
  if (!apiKey || !expectedKey) {
    return { 
      valid: false, 
      response: legacyErrorResponse('Unauthorized', 401) 
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
      response: legacyErrorResponse('Unauthorized', 401) 
    }
  }
  
  return { valid: true }
}
