import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/api-auth'
import { createRateLimit as createMemoryRateLimit, RateLimitConfig } from './rate-limit'

// Redis client interface (to be implemented when Redis is added)
export interface RedisClient {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<boolean>
  ttl(key: string): Promise<number>
  del(key: string): Promise<number>
}

// Environment-based Redis configuration
export function getRedisClient(): RedisClient | null {
  // Check if Redis URL is configured
  if (!process.env.REDIS_URL) {
    console.log('Redis not configured, using in-memory rate limiting')
    return null
  }

  // TODO: Implement actual Redis client when adding Redis dependency
  // For now, return null to use in-memory fallback
  return null
}

// Create rate limiter with Redis support
export function createRedisRateLimit(config: RateLimitConfig) {
  const redisClient = getRedisClient()
  
  // If no Redis, fall back to in-memory
  if (!redisClient) {
    return createMemoryRateLimit(config)
  }

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const clientId = getClientId(request)
    const key = `rate_limit:${clientId}`
    const windowSeconds = Math.ceil(config.windowMs / 1000)

    try {
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
      console.error('Redis rate limit error, falling back to memory:', error)
      // Fall back to in-memory rate limiting
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
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many AI requests. Please wait before trying again.',
  }),

  // API endpoints - moderate
  api: createRedisRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many API requests. Please slow down.',
  }),

  // Webhook endpoints - lenient
  webhook: createRedisRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many webhook requests. Please slow down.',
  }),

  // Authentication endpoints - strict
  auth: createRedisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  }),
}