import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { redisManager } from './redis'
import { logger } from './logger'

// Simple error response function to avoid dependency issues
function errorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json({ 
    success: false, 
    error 
  }, { status })
}

// CSRF token storage for fallback (when Redis is not available)
const csrfTokens = new Map<string, { token: string; expires: number }>()

// Token cleanup interval (every 10 minutes)
const CLEANUP_INTERVAL = 10 * 60 * 1000
const TOKEN_LIFETIME = 60 * 60 * 1000 // 1 hour
const TOKEN_LIFETIME_SECONDS = Math.ceil(TOKEN_LIFETIME / 1000) // Redis TTL in seconds

// Cleanup expired tokens periodically (only for in-memory fallback)
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
 * Store CSRF token in Redis or fallback to in-memory
 */
async function storeCSRFToken(sessionId: string, token: string, expires: number): Promise<void> {
  try {
    const redis = await redisManager.getClient()
    if (redis) {
      const key = `csrf:${sessionId}`
      const tokenData = JSON.stringify({ token, expires })
      await redis.setex(key, TOKEN_LIFETIME_SECONDS, tokenData)
      return
    }
  } catch (error) {
    logger.warn('Failed to store CSRF token in Redis, using in-memory fallback', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
  
  // Fallback to in-memory storage
  csrfTokens.set(sessionId, { token, expires })
}

/**
 * Retrieve CSRF token from Redis or fallback to in-memory
 */
async function getCSRFToken(sessionId: string): Promise<{ token: string; expires: number } | null> {
  try {
    const redis = await redisManager.getClient()
    if (redis) {
      const key = `csrf:${sessionId}`
      const tokenData = await redis.get(key)
      if (tokenData) {
        return JSON.parse(tokenData)
      }
      return null
    }
  } catch (error) {
    logger.warn('Failed to retrieve CSRF token from Redis, using in-memory fallback', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
  
  // Fallback to in-memory storage
  return csrfTokens.get(sessionId) || null
}

/**
 * Delete CSRF token from Redis or fallback to in-memory
 */
async function deleteCSRFToken(sessionId: string): Promise<void> {
  try {
    const redis = await redisManager.getClient()
    if (redis) {
      const key = `csrf:${sessionId}`
      await redis.del(key)
      return
    }
  } catch (error) {
    logger.warn('Failed to delete CSRF token from Redis, using in-memory fallback', { 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
  
  // Fallback to in-memory storage
  csrfTokens.delete(sessionId)
}

/**
 * Generate a CSRF token for a session
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + TOKEN_LIFETIME
  
  await storeCSRFToken(sessionId, token, expires)
  
  return token
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(
  request: NextRequest,
  sessionId: string
): Promise<boolean> {
  // Get token from header or body
  const headerToken = request.headers.get('x-csrf-token')
  
  if (!headerToken) {
    return false
  }
  
  const storedData = await getCSRFToken(sessionId)
  if (!storedData) {
    return false
  }
  
  // Check if token is expired
  if (storedData.expires < Date.now()) {
    await deleteCSRFToken(sessionId)
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
  
  if (!(await validateCSRFToken(request, sessionId))) {
    return errorResponse('Invalid CSRF token', 403)
  }
  
  return null // Allow request to proceed
}

/**
 * Get or create CSRF token for a session
 */
export async function getOrCreateCSRFToken(sessionId: string): Promise<string> {
  const existing = await getCSRFToken(sessionId)
  
  if (existing && existing.expires > Date.now()) {
    return existing.token
  }
  
  return await generateCSRFToken(sessionId)
}

/**
 * Add CSRF token to response headers
 */
export async function addCSRFTokenToResponse(
  response: NextResponse,
  sessionId: string
): Promise<NextResponse> {
  const token = await getOrCreateCSRFToken(sessionId)
  response.headers.set('x-csrf-token', token)
  return response
}
