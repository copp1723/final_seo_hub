import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { errorResponse } from './api-auth'

// CSRF token storage (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expires: number }>()

// Token cleanup interval (every 10 minutes)
const CLEANUP_INTERVAL = 10 * 60 * 1000
const TOKEN_LIFETIME = 60 * 60 * 1000 // 1 hour

// Cleanup expired tokens periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expires < now) {
        csrfTokens.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Generate a CSRF token for a session
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + TOKEN_LIFETIME
  
  csrfTokens.set(sessionId, { token, expires })
  
  return token
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(
  request: NextRequest,
  sessionId: string
): boolean {
  // Get token from header or body
  const headerToken = request.headers.get('x-csrf-token')
  
  if (!headerToken) {
    return false
  }
  
  const storedData = csrfTokens.get(sessionId)
  if (!storedData) {
    return false
  }
  
  // Check if token is expired
  if (storedData.expires < Date.now()) {
    csrfTokens.delete(sessionId)
    return false
  }
  
  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(headerToken),
    Buffer.from(storedData.token)
  )
}

/**
 * CSRF protection middleware for API routes
 */
export async function csrfProtection(
  request: NextRequest,
  getSessionId: () => string | null
): Promise<NextResponse | null> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null
  }
  
  // Skip CSRF for webhook endpoints (they use API keys)
  if (request.url.includes('/webhook')) {
    return null
  }
  
  const sessionId = getSessionId()
  if (!sessionId) {
    return errorResponse('Unauthorized', 401)
  }
  
  if (!validateCSRFToken(request, sessionId)) {
    return errorResponse('Invalid CSRF token', 403)
  }
  
  return null // Allow request to proceed
}

/**
 * Get or create CSRF token for a session
 */
export function getOrCreateCSRFToken(sessionId: string): string {
  const existing = csrfTokens.get(sessionId)
  
  if (existing && existing.expires > Date.now()) {
    return existing.token
  }
  
  return generateCSRFToken(sessionId)
}

/**
 * Add CSRF token to response headers
 */
export function addCSRFTokenToResponse(
  response: NextResponse,
  sessionId: string
): NextResponse {
  const token = getOrCreateCSRFToken(sessionId)
  response.headers.set('x-csrf-token', token)
  return response
}