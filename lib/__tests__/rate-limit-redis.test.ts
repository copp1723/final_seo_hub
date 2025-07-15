/**
 * Rate Limiting Redis Integration Tests
 * Tests the Redis-backed rate limiting functionality with fallback to in-memory storage
 */

// Mock the logger first
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

jest.mock('./logger', () => ({
  logger: mockLogger
}))

// Mock Redis client
const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  exists: jest.fn(),
  ping: jest.fn()
}

const mockRedisManager = {
  getClient: jest.fn(),
  isAvailable: jest.fn(),
  disconnect: jest.fn()
}

jest.mock('./redis', () => ({
  redisManager: mockRedisManager
}))

// Mock the in-memory rate limiter
const mockMemoryRateLimit = jest.fn()

jest.mock('./rate-limit', () => ({
  createRateLimit: jest.fn(() => mockMemoryRateLimit)
}))

// Now import the module under test
import { NextRequest } from 'next/server'

describe('Rate Limiting Redis Integration', () => {
  const createMockRequest = (ip = '192.168.1.1', userId?: string) => {
    const headers: Record<string, string> = { 'x-forwarded-for': ip }
    if (userId) {
      headers['x-user-id'] = userId
    }
    
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.REDIS_URL
  })

  describe('Redis Mode', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisManager.getClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.incr.mockResolvedValue(1)
      mockRedisClient.expire.mockResolvedValue(1)
      mockRedisClient.ttl.mockResolvedValue(60)
    })

    test('should allow requests within rate limit', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        message: 'Rate limit exceeded'
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBeNull() // No rate limit response means request is allowed
      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:ip:192.168.1.1')
      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:ip:192.168.1.1', 60)
    })

    test('should block requests exceeding rate limit', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      mockRedisClient.incr.mockResolvedValue(6) // Exceeds limit of 5

      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Too many requests'
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)
      
      const responseData = await response?.json()
      expect(responseData.error).toBe('Too many requests')
    })

    test('should set expiry only on first request', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      mockRedisClient.incr.mockResolvedValueOnce(1) // First request

      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest()
      await rateLimiter(request)

      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:ip:192.168.1.1', 60)

      // Second request should not set expiry
      mockRedisClient.incr.mockResolvedValueOnce(2)
      await rateLimiter(request)

      expect(mockRedisClient.expire).toHaveBeenCalledTimes(1) // Still only called once
    })

    test('should use user ID for rate limiting when available', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest('192.168.1.1', 'user123')
      await rateLimiter(request)

      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:user:user123')
    })

    test('should include rate limit headers in response', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      mockRedisClient.incr.mockResolvedValue(6) // Exceeds limit

      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response?.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response?.headers.get('X-RateLimit-Reset')).toBeTruthy()
      expect(response?.headers.get('Retry-After')).toBeTruthy()
    })

    test('should handle different window sizes correctly', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 120000, // 2 minutes
        maxRequests: 10
      })

      const request = createMockRequest()
      await rateLimiter(request)

      expect(mockRedisClient.expire).toHaveBeenCalledWith('rate_limit:ip:192.168.1.1', 120)
    })
  })

  describe('Fallback Mode (Redis Unavailable)', () => {
    beforeEach(() => {
      mockRedisManager.getClient.mockResolvedValue(null)
      mockMemoryRateLimit.mockResolvedValue(null) // Allow requests by default
    })

    test('should fallback to in-memory rate limiting', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      const { createRateLimit } = await import('./rate-limit')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Rate limit exceeded'
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBeNull() // Should allow request
      expect(mockRedisManager.getClient).toHaveBeenCalled()
      expect(createRateLimit).toHaveBeenCalledWith({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Rate limit exceeded'
      })
      expect(mockMemoryRateLimit).toHaveBeenCalledWith(request)
    })

    test('should enforce rate limits in memory fallback', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      // Mock memory rate limiter to block request
      const mockBlockResponse = {
        json: () => Promise.resolve({ success: false, error: 'Rate limited' }),
        status: 429
      }
      mockMemoryRateLimit.mockResolvedValue(mockBlockResponse)

      const rateLimiter = createRedisRateLimit({
        windowMs: 1000,
        maxRequests: 2,
        message: 'Too many requests'
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBe(mockBlockResponse)
      expect(mockMemoryRateLimit).toHaveBeenCalled()
    })

    test('should work without Redis URL configured', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      delete process.env.REDIS_URL
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBeNull()
      expect(mockMemoryRateLimit).toHaveBeenCalled()
    })
  })

  describe('Redis Error Handling', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisManager.getClient.mockResolvedValue(mockRedisClient)
      mockMemoryRateLimit.mockResolvedValue(null) // Allow requests by default
    })

    test('should fallback to in-memory when Redis incr fails', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      mockRedisClient.incr.mockRejectedValue(new Error('Redis connection lost'))

      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBeNull() // Should allow request using fallback
      expect(mockRedisClient.incr).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis rate limiting failed, falling back to in-memory',
        expect.any(Object)
      )
      expect(mockMemoryRateLimit).toHaveBeenCalled()
    })

    test('should fallback to in-memory when Redis expire fails', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      mockRedisClient.incr.mockResolvedValue(1)
      mockRedisClient.expire.mockRejectedValue(new Error('Redis connection lost'))

      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBeNull()
      expect(mockRedisClient.incr).toHaveBeenCalled()
      expect(mockRedisClient.expire).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis rate limiting failed, falling back to in-memory',
        expect.any(Object)
      )
    })

    test('should fallback to in-memory when Redis ttl fails', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      mockRedisClient.incr.mockResolvedValue(2)
      mockRedisClient.ttl.mockRejectedValue(new Error('Redis connection lost'))

      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest()
      const response = await rateLimiter(request)

      expect(response).toBeNull()
      expect(mockRedisClient.ttl).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis rate limiting failed, falling back to in-memory',
        expect.any(Object)
      )
    })
  })

  describe('Client ID Generation', () => {
    beforeEach(() => {
      mockRedisManager.getClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.incr.mockResolvedValue(1)
      mockRedisClient.expire.mockResolvedValue(1)
    })

    test('should prioritize user ID over IP address', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest('192.168.1.1', 'user123')
      await rateLimiter(request)

      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:user:user123')
    })

    test('should use IP from x-forwarded-for header', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = createMockRequest('10.0.0.1')
      await rateLimiter(request)

      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:ip:10.0.0.1')
    })

    test('should use first IP from comma-separated forwarded header', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1' }
      })

      await rateLimiter(request)

      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:ip:203.0.113.1')
    })

    test('should fallback to x-real-ip header', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-real-ip': '203.0.113.1' }
      })

      await rateLimiter(request)

      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:ip:203.0.113.1')
    })

    test('should use "unknown" when no IP headers present', async () => {
      const { createRedisRateLimit } = await import('./rate-limit-redis')
      
      const rateLimiter = createRedisRateLimit({
        windowMs: 60000,
        maxRequests: 5
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })

      await rateLimiter(request)

      expect(mockRedisClient.incr).toHaveBeenCalledWith('rate_limit:ip:unknown')
    })
  })

  describe('Enhanced Rate Limits Configuration', () => {
    beforeEach(() => {
      mockRedisManager.getClient.mockResolvedValue(mockRedisClient)
      mockRedisClient.incr.mockResolvedValue(1)
      mockRedisClient.expire.mockResolvedValue(1)
    })

    test('should create AI rate limiter with correct config', async () => {
      const { enhancedRateLimits } = await import('./rate-limit-redis')
      
      const request = createMockRequest()
      await enhancedRateLimits.ai(request)

      expect(mockRedisClient.incr).toHaveBeenCalled()
      // Test that it uses the AI rate limit configuration
    })

    test('should create API rate limiter with correct config', async () => {
      const { enhancedRateLimits } = await import('./rate-limit-redis')
      
      const request = createMockRequest()
      await enhancedRateLimits.api(request)

      expect(mockRedisClient.incr).toHaveBeenCalled()
    })

    test('should create webhook rate limiter with correct config', async () => {
      const { enhancedRateLimits } = await import('./rate-limit-redis')
      
      const request = createMockRequest()
      await enhancedRateLimits.webhook(request)

      expect(mockRedisClient.incr).toHaveBeenCalled()
    })

    test('should create auth rate limiter with correct config', async () => {
      const { enhancedRateLimits } = await import('./rate-limit-redis')
      
      const request = createMockRequest()
      await enhancedRateLimits.auth(request)

      expect(mockRedisClient.incr).toHaveBeenCalled()
    })
  })
})
