import { POST } from './route'
import { prisma } from './././././lib/prisma'
import { queueEmailWithPreferences } from './././././lib/mailgun/queue'
import { contentAddedTemplate } from './././././lib/mailgun/content-notifications'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('./././././lib/prisma', () => ({
  prisma: {
    request: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    user: {
      findFirst: jest.fn()
    }
  }
}))

jest.mock('./././././lib/mailgun/queue', () => ({
  queueEmailWithPreferences: jest.fn()
}))

jest.mock('./././././lib/mailgun/content-notifications', () => ({
  contentAddedTemplate: jest.fn()
}))

jest.mock('./././././lib/package-utils', () => ({
  incrementUsage: jest.fn(),
  TaskType: 'pages' as const
}))

describe('SEOWorks Webhook - Stress Testing', () => {
  const mockEnv = {
    SEOWORKS_WEBHOOK_SECRET: 'test-secret-key',
    NEXT_PUBLIC_APP_URL: 'https://seohub.example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
    process.env = { ...mockEnv }
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
  })

  const createMockRequest = (payload: any) => {
    return new NextRequest('http://localhost/api/seoworks/webhook', {
      method: 'POST',
      headers: {
        'x-api-key': mockEnv.SEOWORKS_WEBHOOK_SECRET,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  }

  describe('High Volume Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@dealership.com',
        name: 'Test User',
        role: 'USER'
      }

      const mockRequest = {
        id: 'req_123',
        userId: 'user_123',
        user: mockUser,
        title: 'SEO Content',
        type: 'page',
        status: 'IN_PROGRESS',
        completedTasks: []
      }

      ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
      ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)
      ;(contentAddedTemplate as jest.Mock).mockReturnValue({
        subject: 'Content Added',
        html: '<html>Test</html>'
      })

      // Create 10 concurrent requests
      const payloads = Array.from({ length: 10 }, (_, i) => ({
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          externalId: `task_${i}`,
          clientId: 'user_123',
          taskType: 'page',
          status: 'completed',
          deliverables: [
            {
              type: 'page',
              title: `Test Page ${i}`,
              url: `https://example.com/page-${i}`
            }
          ]
        }
      }))

      const requests = payloads.map(payload => 
        POST(createMockRequest(payload))
      )

      const responses = await Promise.all(requests)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should have called email queue twice for each request (task completion + status change)
      expect(queueEmailWithPreferences).toHaveBeenCalledTimes(20)
    }, 10000) // 10 second timeout

    it('should handle rapid sequential requests', async () => {
      const mockUser = {
        id: 'user_456',
        email: 'sequential@dealership.com',
        name: 'Sequential User',
        role: 'USER'
      }

      const mockRequest = {
        id: 'req_456',
        userId: 'user_456',
        user: mockUser,
        title: 'Sequential Content',
        type: 'blog',
        status: 'IN_PROGRESS',
        completedTasks: []
      }

      ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
      ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)
      ;(contentAddedTemplate as jest.Mock).mockReturnValue({
        subject: 'Blog Added',
        html: '<html>Blog Test</html>'
      })

      // Send 5 rapid sequential requests
      for (let i = 0; i < 5; i++) {
        const payload = {
          eventType: 'task.completed',
          timestamp: new Date().toISOString(),
          data: {
            externalId: `seq_task_${i}`,
            clientId: 'user_456',
            taskType: 'blog',
            status: 'completed',
            deliverables: [
              {
                type: 'blog',
                title: `Sequential Blog ${i}`,
                url: `https://example.com/blog-${i}`
              }
            ]
          }
        }

        const response = await POST(createMockRequest(payload))
        expect(response.status).toBe(200)
      }

      // Should have called email queue twice for each request (task completion + status change)
      expect(queueEmailWithPreferences).toHaveBeenCalledTimes(10)
    })
  })

  describe('Edge Case Scenarios', () => {
    it('should handle extremely large payloads', async () => {
      const mockUser = {
        id: 'user_large',
        email: 'large@dealership.com',
        name: 'Large Payload User',
        role: 'USER'
      }

      const mockRequest = {
        id: 'req_large',
        userId: 'user_large',
        user: mockUser,
        title: 'Large Content',
        type: 'page',
        status: 'IN_PROGRESS',
        completedTasks: []
      }

      ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
      ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)

      // Create large payload with very long content
      const longTitle = 'A'.repeat(1000)
      const longDescription = 'B'.repeat(5000)
      
      const payload = {
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'large_task',
          clientId: 'user_large',
          taskType: 'page',
          status: 'completed',
          deliverables: [
            {
              type: 'page',
              title: longTitle,
              description: longDescription,
              url: 'https://example.com/large-page'
            }
          ]
        }
      }

      const response = await POST(createMockRequest(payload))
      expect(response.status).toBe(200)
    })

    it('should handle special unicode characters', async () => {
      const mockUser = {
        id: 'user_unicode',
        email: 'unicode@dealership.com',
        name: '测试用户 👨‍💼',
        role: 'USER'
      }

      const mockRequest = {
        id: 'req_unicode',
        userId: 'user_unicode',
        user: mockUser,
        title: 'Unicode Content',
        type: 'page',
        status: 'IN_PROGRESS',
        completedTasks: []
      }

      ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
      ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)
      ;(contentAddedTemplate as jest.Mock).mockReturnValue({
        subject: 'Unicode Content Added',
        html: '<html>Unicode Test</html>'
      })

      const payload = {
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'unicode_task',
          clientId: 'user_unicode',
          taskType: 'page',
          status: 'completed',
          deliverables: [
            {
              type: 'page',
              title: '🚗 2024年最新車款 - 特別優惠！🎉 汽车销售 العربية ελληνικά',
              url: 'https://example.com/unicode-page'
            }
          ]
        }
      }

      const response = await POST(createMockRequest(payload))
      expect(response.status).toBe(200)

      expect(contentAddedTemplate).toHaveBeenCalledWith(
        expect.any(Object),
        mockUser,
        expect.objectContaining({
          title: '🚗 2024年最新車款 - 特別優惠！🎉 汽车销售 العربية ελληνικά',
          type: 'page'
        })
      )
    })

    it('should handle malformed but valid JSON', async () => {
      const mockUser = {
        id: 'user_malformed',
        email: 'malformed@dealership.com',
        name: 'Malformed User',
        role: 'USER'
      }

      const mockRequest = {
        id: 'req_malformed',
        userId: 'user_malformed',
        user: mockUser,
        title: 'Malformed Content',
        type: 'page',
        status: 'IN_PROGRESS',
        completedTasks: []
      }

      ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
      ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)

      // Valid JSON but with unexpected structure
      const payload = {
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'malformed_task',
          clientId: 'user_malformed',
          taskType: 'page',
          status: 'completed',
          // Missing deliverables - should be handled gracefully
          unexpectedField: 'should be ignored',
          nestedObject: {
            deep: {
              value: 'test'
            }
          }
        }
      }

      const response = await POST(createMockRequest(payload))
      expect(response.status).toBe(200)
    })
  })

  describe('Error Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      ;(prisma.requests.findFirst as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      const payload = {
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'db_fail_task',
          clientId: 'user_123',
          taskType: 'page',
          status: 'completed'
        }
      }

      const response = await POST(createMockRequest(payload))
      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
    })

    it('should handle email queue failures gracefully', async () => {
      const mockUser = {
        id: 'user_email_fail',
        email: 'emailfail@dealership.com',
        name: 'Email Fail User',
        role: 'USER'
      }

      const mockRequest = {
        id: 'req_email_fail',
        userId: 'user_email_fail',
        user: mockUser,
        title: 'Email Fail Content',
        type: 'page',
        status: 'IN_PROGRESS',
        completedTasks: []
      }

      ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
      ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)
      ;(contentAddedTemplate as jest.Mock).mockReturnValue({
        subject: 'Content Added',
        html: '<html>Test</html>'
      })
      ;(queueEmailWithPreferences as jest.Mock).mockRejectedValue(new Error('Email queue failed'))

      const payload = {
        eventType: 'task.completed',
        timestamp: new Date().toISOString(),
        data: {
          externalId: 'email_fail_task',
          clientId: 'user_email_fail',
          taskType: 'page',
          status: 'completed',
          deliverables: [
            {
              type: 'page',
              title: 'Test Page',
              url: 'https://example.com/test'
            }
          ]
        }
      }

      const response = await POST(createMockRequest(payload))
      // Should still return 500 because email failure should cause the whole operation to fail
      expect(response.status).toBe(500)
    })
  })

  describe('Authentication Edge Cases', () => {
    it('should handle missing API key', async () => {
      const request = new NextRequest('http://localhost/api/seoworks/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // No x-api-key header
        },
        body: JSON.stringify({
          eventType: 'task.completed',
          data: { externalId: 'test' }
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should handle incorrect API key', async () => {
      const request = new NextRequest('http://localhost/api/seoworks/webhook', {
        method: 'POST',
        headers: {
          'x-api-key': 'wrong-key',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          eventType: 'task.completed',
          data: { externalId: 'test' }
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should handle timing attack attempts', async () => {
      const correctKey = mockEnv.SEOWORKS_WEBHOOK_SECRET
      const wrongKeys = [
        'wrong-key',
        correctKey.slice(0, -1), // One character short
        correctKey + 'x', // One character too long
        '', // Empty key
      ]

      const results = await Promise.all(
        wrongKeys.map(async (key) => {
          const start = Date.now()
          const request = new NextRequest('http://localhost/api/seoworks/webhook', {
            method: 'POST',
            headers: {
              'x-api-key': key,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              eventType: 'task.completed',
              data: { externalId: 'test' }
            })
          })

          const response = await POST(request)
          const end = Date.now()
          return { status: response.status, duration: end - start }
        })
      )

      // All should be unauthorized
      results.forEach(result => {
        expect(result.status).toBe(401)
      })

      // Timing differences should be minimal (timing-safe comparison)
      const durations = results.map(r => r.duration)
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)
      expect(maxDuration - minDuration).toBeLessThan(100) // Should be within 100ms
    })
  })
})
