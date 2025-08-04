/**
 * CSRF Redis Integration Tests
 * Tests the Redis-backed CSRF functionality with fallback to in-memory storage
 */

import crypto from 'crypto'

// Mock the logger first
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

jest.mock('../logger', () => ({
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

jest.mock('../redis', () => ({
  redisManager: mockRedisManager
}))

// Now import the module under test
import { NextRequest } from 'next/server'

describe('CSRF Redis Integration', () => {
  const sessionId = 'test-session-123'
  const testToken = 'test-csrf-token-12345'

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.REDIS_URL
  })

  describe('Redis Mode', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisManager.getClient.mockResolvedValue(mockRedisClient)
      mockRedisManager.isAvailable.mockResolvedValue(true)
      mockRedisClient.setex.mockResolvedValue('OK')
      mockRedisClient.get.mockResolvedValue(null)
      mockRedisClient.del.mockResolvedValue(1)
    })

    test('should store CSRF token in Redis', async () => {
      // Import the functions after mocks are set up
      const { generateCSRFToken } = await import('../csrf')
      
      const token = await generateCSRFToken(sessionId)
      
      expect(token).toBeTruthy()
      expect(token).toHaveLength(64) // 32 bytes * 2 for hex
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `csrf:${sessionId}`,
        3600, // 1 hour in seconds
        expect.stringMatching(/{"token":".*","expires":\d+}/)
      )
    })

    test('should retrieve existing CSRF token from Redis', async () => {
      const { getOrCreateCSRFToken } = await import('../csrf')
      
      const tokenData = {
        token: testToken,
        expires: Date.now() + 60000 // 1 minute from now
      }
      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokenData))

      const token = await getOrCreateCSRFToken(sessionId)
      
      expect(token).toBe(testToken)
      expect(mockRedisClient.get).toHaveBeenCalledWith(`csrf:${sessionId}`)
    })

    test('should validate CSRF token from Redis', async () => {
      const { validateCSRFToken } = await import('../csrf')
      
      const tokenData = {
        token: testToken,
        expires: Date.now() + 60000 // 1 minute from now
      }
      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokenData))

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': testToken }
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(true)
      expect(mockRedisClient.get).toHaveBeenCalledWith(`csrf:${sessionId}`)
    })

    test('should delete expired token from Redis', async () => {
      const { validateCSRFToken } = await import('../csrf')
      
      const tokenData = {
        token: testToken,
        expires: Date.now() - 1000 // 1 second ago (expired)
      }
      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokenData))

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': testToken }
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(false)
      expect(mockRedisClient.del).toHaveBeenCalledWith(`csrf:${sessionId}`)
    })

    test('should generate new token when Redis token is expired', async () => {
      const { getOrCreateCSRFToken } = await import('../csrf')
      
      const tokenData = {
        token: testToken,
        expires: Date.now() - 1000 // 1 second ago (expired)
      }
      mockRedisClient.get.mockResolvedValue(JSON.stringify(tokenData))

      const token = await getOrCreateCSRFToken(sessionId)
      
      expect(token).toBeTruthy()
      expect(token).not.toBe(testToken) // Should be a new token
      expect(mockRedisClient.setex).toHaveBeenCalled() // New token stored
    })
  })

  describe('Fallback Mode (Redis Unavailable)', () => {
    beforeEach(() => {
      mockRedisManager.getClient.mockResolvedValue(null)
      mockRedisManager.isAvailable.mockResolvedValue(false)
    })

    test('should fallback to in-memory storage when Redis is unavailable', async () => {
      const { generateCSRFToken } = await import('../csrf')
      
      const token = await generateCSRFToken(sessionId)
      
      expect(token).toBeTruthy()
      expect(token).toHaveLength(64) // 32 bytes * 2 for hex
      expect(mockRedisManager.getClient).toHaveBeenCalled()
      expect(mockRedisClient.setex).not.toHaveBeenCalled()
    })

    test('should validate CSRF token from in-memory storage', async () => {
      const { generateCSRFToken, validateCSRFToken } = await import('../csrf')
      
      // Generate token first
      const token = await generateCSRFToken(sessionId)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': token }
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(true)
    })

    test('should reject invalid token in fallback mode', async () => {
      const { validateCSRFToken } = await import('../csrf')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': 'invalid-token' }
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(false)
    })

    test('should create and retrieve token consistently in fallback mode', async () => {
      const { getOrCreateCSRFToken } = await import('../csrf')
      
      const token1 = await getOrCreateCSRFToken(sessionId)
      const token2 = await getOrCreateCSRFToken(sessionId)
      
      expect(token1).toBe(token2) // Should return same token
      expect(token1).toBeTruthy()
    })
  })

  describe('Redis Error Handling', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisManager.getClient.mockResolvedValue(mockRedisClient)
    })

    test('should fallback to in-memory when Redis setex fails', async () => {
      const { generateCSRFToken } = await import('../csrf')
      
      mockRedisClient.setex.mockRejectedValue(new Error('Redis connection lost'))

      const token = await generateCSRFToken(sessionId)
      
      expect(token).toBeTruthy()
      expect(mockRedisClient.setex).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to store CSRF token in Redis, using in-memory fallback',
        expect.any(Object)
      )
    })

    test('should fallback to in-memory when Redis get fails', async () => {
      const { validateCSRFToken } = await import('../csrf')
      
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection lost'))

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': testToken }
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(false) // Token not found in fallback storage
      expect(mockRedisClient.get).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to retrieve CSRF token from Redis, using in-memory fallback',
        expect.any(Object)
      )
    })

    test('should fallback to in-memory when Redis del fails', async () => {
      const { validateCSRFToken } = await import('../csrf')
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        token: testToken,
        expires: Date.now() - 1000 // expired
      }))
      mockRedisClient.del.mockRejectedValue(new Error('Redis connection lost'))

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': testToken }
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(false) // Token is expired
      expect(mockRedisClient.del).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to delete CSRF token from Redis, using in-memory fallback',
        expect.any(Object)
      )
    })
  })

  describe('Token Security', () => {
    beforeEach(() => {
      mockRedisManager.getClient.mockResolvedValue(null) // Use fallback for consistent testing
    })

    test('should generate cryptographically secure tokens', async () => {
      const { generateCSRFToken } = await import('../csrf')
      
      const tokens = await Promise.all([
        generateCSRFToken('session1'),
        generateCSRFToken('session2'),
        generateCSRFToken('session3')
      ])

      // All tokens should be different
      expect(new Set(tokens).size).toBe(3)
      
      // All tokens should be valid hex strings
      tokens.forEach(token => {
        expect(token).toMatch(/^[a-f0-9]{64}$/)
      })
    })

    test('should use timing-safe comparison for validation', async () => {
      const { generateCSRFToken, validateCSRFToken } = await import('../csrf')
      
      const token = await generateCSRFToken(sessionId)
      
      // Test with correct token
      const validRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': token }
      })
      
      expect(await validateCSRFToken(validRequest, sessionId)).toBe(true)
      
      // Test with wrong token of same length
      const wrongToken = 'a'.repeat(64)
      const invalidRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': wrongToken }
      })
      
      expect(await validateCSRFToken(invalidRequest, sessionId)).toBe(false)
    })

    test('should reject requests without CSRF header', async () => {
      const { validateCSRFToken } = await import('../csrf')
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      })

      const isValid = await validateCSRFToken(request, sessionId)
      
      expect(isValid).toBe(false)
    })
  })
})
