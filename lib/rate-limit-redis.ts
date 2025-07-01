import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/api-auth'
import { createRateLimit as createMemoryRateLimit, RateLimitConfig } from './rate-limit'
import { RATE_LIMITS, TIME_CONSTANTS } from '@/lib/constants'
import { redisManager } from './redis'
import { logger } from './logger'

// Create rate limiter with Redis support
export function createRedisRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const clientId = getClientId(request)
    const key = `rate_limit:${clientId}`
    const windowSeconds = Math.ceil(config.windowMs / 1000)

    try {
      const redisClient = await redisManager.getClient()
      
      // If no Redis, fall back to in-memory
      if (!redisClient) {
        return createMemoryRateLimit(config)(request)
      }

      // Increment counter
      const count = await redisClient.incr(key)
      
      // Set expiry on first request
      if (count === 1) {
        await redisClient.expire(key, windowSeconds)
      }

      // Get TTL for reset time
      const ttl = await redisClient.ttl(key)
      const resetTime = Date.now() + (ttl * 1000)

      // Check if limit exceeded
      if (count > config.maxRequests) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: config.message || 'Rate limit exceeded',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetTime.toString(),
              'Retry-After': ttl.toString(),
            },
          }
        )
      }

      // Add rate limit headers to successful requests
      return null
    } catch (error) {
      // Redis rate limit error, falling back to in-memory rate limiting
      logger.warn('Redis rate limiting failed, falling back to in-memory', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return createMemoryRateLimit(config)(request)
    }
  }
}

function getClientId(request: NextRequest): string {
  // Try to get user ID from headers first
  const userId = request.headers.get('x-user-id')
  if (userId) return `user:${userId}`

  // Fallback to IP address from headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown'
  return `ip:${ip}`
}

// Enhanced rate limit configurations with Redis support
export const enhancedRateLimits = {
  // AI endpoints - more restrictive
  ai: createRedisRateLimit({
    windowMs: RATE_LIMITS.AI.WINDOW,
    maxRequests: RATE_LIMITS.AI.MAX_REQUESTS,
    message: 'Too many AI requests. Please wait before trying again.',
  }),

  // API endpoints - moderate
  api: createRedisRateLimit({
    windowMs: TIME_CONSTANTS.ONE_MINUTE,
    maxRequests: 30, // 30 requests per minute
    message: 'Too many API requests. Please slow down.',
  }),

  // Webhook endpoints - lenient
  webhook: createRedisRateLimit({
    windowMs: RATE_LIMITS.WEBHOOK.WINDOW,
    maxRequests: RATE_LIMITS.WEBHOOK.MAX_REQUESTS,
    message: 'Too many webhook requests. Please slow down.',
  }),

  // Authentication endpoints - strict
  auth: createRedisRateLimit({
    windowMs: RATE_LIMITS.AUTH.WINDOW,
    maxRequests: RATE_LIMITS.AUTH.MAX_REQUESTS,
    message: 'Too many authentication attempts. Please try again later.',
  }),
}