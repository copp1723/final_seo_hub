import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/lib/api-auth'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting
const rateLimitStore: RateLimitStore = {}

// Memory management constants
const MAX_RATE_LIMIT_ENTRIES = 10000 // Maximum entries to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000 // Clean up every 5 minutes
const AGGRESSIVE_CLEANUP_THRESHOLD = 8000 // Trigger more aggressive cleanup

// Track last cleanup time to ensure it doesn't run too frequently
let lastCleanupTime = Date.now()

// Cleanup function that can be called on-demand
function performMemoryCleanup(now: number = Date.now()) {
  // Skip if cleanup was performed recently (within 1 minute)
  if (now - lastCleanupTime < 60 * 1000) {
    return
  }

  const keysToDelete: string[] = []

  for (const [key, entry] of Object.entries(rateLimitStore)) {
    if (now > entry.resetTime) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach(key => delete rateLimitStore[key])
  lastCleanupTime = now

  // If still too many entries, remove oldest ones
  const remainingEntries = Object.entries(rateLimitStore)
  if (remainingEntries.length > MAX_RATE_LIMIT_ENTRIES) {
    const sortedEntries = remainingEntries.sort((a, b) => a[1].resetTime - b[1].resetTime)
    const toDelete = sortedEntries.slice(0, remainingEntries.length - MAX_RATE_LIMIT_ENTRIES)
    toDelete.forEach(([key]) => delete rateLimitStore[key])
  }

  if (keysToDelete.length > 0) {
    console.log(`[RATE LIMIT] Cleaned up ${keysToDelete.length} expired entries. Current size: ${Object.keys(rateLimitStore).length}`)
  }
}

// Only set up interval cleanup in non-serverless environments
// In serverless, cleanup will happen on-demand during requests
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'development') {
  // Check if we're likely in a long-running process (not serverless)
  const cleanupInterval = setInterval(() => {
    performMemoryCleanup()
  }, CLEANUP_INTERVAL)

  // Clean up interval on process exit
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval)
  })
  
  process.on('SIGINT', () => {
    clearInterval(cleanupInterval)
  })
}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
}

export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Get client identifier (IP address or user ID)
    const clientId = getClientId(request)
    const now = Date.now()

    // Perform cleanup if memory usage is high or periodically
    const currentSize = Object.keys(rateLimitStore).length
    if (currentSize > AGGRESSIVE_CLEANUP_THRESHOLD) {
      performMemoryCleanup(now)
    } else {
      // Light cleanup of just expired entries for this request
      cleanupExpiredEntries(now)
    }

    // Get or create rate limit entry
    const entry = rateLimitStore[clientId] || { count: 0, resetTime: now + config.windowMs }

    // Reset if window has expired
    if (now > entry.resetTime) {
      entry.count = 0
      entry.resetTime = now + config.windowMs
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000)

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: config.message || 'Rate limit exceeded'
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': resetIn.toString()
          }
        }
      )
    }

    // Increment counter
    entry.count++
    rateLimitStore[clientId] = entry

    return null // Allow request to proceed
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

function cleanupExpiredEntries(now: number) {
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}

// Predefined rate limit configurations
export const rateLimits = {
  // AI endpoints - more restrictive
  ai: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many AI requests.Please wait before trying again.'
  }),

  // API endpoints - moderate
  api: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many API requests.Please slow down.'
  }),

  // Webhook endpoints - lenient
  webhook: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many webhook requests.Please slow down.'
  })
}
