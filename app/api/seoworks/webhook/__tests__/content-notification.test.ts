import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { contentAddedTemplate } from '@/lib/mailgun/content-notifications'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    request: {
      findFirst: jest.fn(),
      update: jest.fn()
    },
    user: {
      findFirst: jest.fn()
    }
  }
}))

jest.mock('@/lib/mailgun/queue', () => ({
  queueEmailWithPreferences: jest.fn()
}))

jest.mock('@/lib/mailgun/content-notifications', () => ({
  contentAddedTemplate: jest.fn()
}))

jest.mock('@/lib/package-utils', () => ({
  incrementUsage: jest.fn(),
  TaskType: 'pages' as const
}))

describe('SEOWorks Webhook - Content Notifications', () => {
  const mockEnv = {
    SEOWORKS_WEBHOOK_SECRET: 'test-secret-key',
    NEXT_PUBLIC_APP_URL: 'https://seohub.example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...mockEnv }
  })

  const createMockRequest = (payload: any) => {
    return new NextRequest('http://localhost/api/seoworks/webhook', {
      method: 'POST',
      headers: {
        'x-api-key': mockEnv.SEOWORKS_WEBHOOK_SECRET
      },
      body: JSON.stringify(payload)
    })
  }

  it('should send content-specific email for completed page task', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'john@dealership.com',
      name: 'John Doe',
      role: 'USER'
    }

    const mockRequest = {
      id: 'req_123',
      userId: 'user_123',
      user: mockUser,
      title: 'SEO Content Request',
      type: 'page',
      status: 'IN_PROGRESS',
      packageType: 'GOLD',
      pagesCompleted: 1,
      blogsCompleted: 2,
      gbpPostsCompleted: 4,
      improvementsCompleted: 0,
      completedTasks: []
    }

    const payload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: 'seo_task_123',
        clientId: 'user_123',
        taskType: 'page',
        status: 'completed',
        deliverables: [
          {
            type: 'page',
            title: '2024 Toyota Camry Deals in Chicago',
            url: 'https://dealership.com/2024-toyota-camry-chicago'
          }
        ]
      }
    }

    ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
    ;(prisma.requests.update as jest.Mock).mockResolvedValue({ ...mockRequest,
      pagesCompleted: 2,
      completedTasks: [
        {
          title: '2024 Toyota Camry Deals in Chicago',
          type: 'page',
          url: 'https://dealership.com/2024-toyota-camry-chicago',
          completedAt: new Date().toISOString()
        }
      ]
    })
    ;(contentAddedTemplate as jest.Mock).mockReturnValue({
      subject: '✨ New Page Added: "2024 Toyota Camry Deals in Chicago"',
      html: '<html>Content notification email</html>'
    })

    const request = createMockRequest(payload)
    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(contentAddedTemplate).toHaveBeenCalledWith(
      expect.any(Object),
      mockUser,
      {
        title: '2024 Toyota Camry Deals in Chicago',
        type: 'page',
        url: 'https://dealership.com/2024-toyota-camry-chicago',
        completedAt: expect.any(String)
      }
    )
    expect(queueEmailWithPreferences).toHaveBeenCalledWith(
      'user_123',
      'taskCompleted',
      expect.objectContaining({
        subject: '✨ New Page Added: "2024 Toyota Camry Deals in Chicago"',
        html: '<html>Content notification email</html>',
        to: 'john@dealership.com'
      })
    )
  })

  it('should send content-specific email for blog posts', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'sarah@dealership.com',
      name: 'Sarah Smith',
      role: 'USER'
    }

    const mockRequest = {
      id: 'req_456',
      userId: 'user_123',
      user: mockUser,
      title: 'Monthly Blog Content',
      type: 'blog',
      status: 'IN_PROGRESS',
      blogsCompleted: 3,
      completedTasks: []
    }

    const payload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: 'seo_task_456',
        clientId: 'user_123',
        taskType: 'blog',
        status: 'completed',
        deliverables: [
          {
            type: 'blog',
            title: 'Winter Car Maintenance Tips for 2024',
            url: 'https://dealership.com/blog/winter-maintenance-tips'
          }
        ]
      }
    }

    ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
    ;(prisma.requests.update as jest.Mock).mockResolvedValue({ ...mockRequest,
      blogsCompleted: 4
    })
    ;(contentAddedTemplate as jest.Mock).mockReturnValue({
      subject: '✨ Blog Post Added: "Winter Car Maintenance Tips for 2024"',
      html: '<html>Blog notification email</html>'
    })

    const request = createMockRequest(payload)
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(contentAddedTemplate).toHaveBeenCalled()
    expect(queueEmailWithPreferences).toHaveBeenCalledWith(
      'user_123',
      'taskCompleted',
      expect.objectContaining({
        subject: '✨ Blog Post Added: "Winter Car Maintenance Tips for 2024"'
      })
    )
  })

  it('should send content-specific email for GBP posts', async () => {
    const mockUser = {
      id: 'user_789',
      email: 'mike@dealership.com',
      name: 'Mike Johnson',
      role: 'USER'
    }

    const mockRequest = {
      id: 'req_789',
      userId: 'user_789',
      user: mockUser,
      title: 'GBP Posts',
      type: 'gbp_post',
      status: 'IN_PROGRESS',
      gbpPostsCompleted: 5,
      completedTasks: []
    }

    const payload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: 'seo_task_789',
        clientId: 'user_789',
        taskType: 'gbp-post', // Note: different format
        status: 'completed',
        deliverables: [
          {
            type: 'gbp-post',
            title: 'Black Friday Special - 0% APR on All Models',
            url: 'https://posts.gle/abc123'
          }
        ]
      }
    }

    ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
    ;(prisma.requests.update as jest.Mock).mockResolvedValue({ ...mockRequest,
      gbpPostsCompleted: 6
    })
    ;(contentAddedTemplate as jest.Mock).mockReturnValue({
      subject: '✨ Google Business Profile Post Added: "Black Friday Special - 0% APR on All Models"',
      html: '<html>GBP notification email</html>'
    })

    const request = createMockRequest(payload)
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(contentAddedTemplate).toHaveBeenCalled()
    expect(queueEmailWithPreferences).toHaveBeenCalledWith(
      'user_789',
      'taskCompleted',
      expect.objectContaining({
        subject: '✨ Google Business Profile Post Added: "Black Friday Special - 0% APR on All Models"'
      })
    )
  })

  it('should use regular task template for non-content tasks', async () => {
    const mockUser = {
      id: 'user_999',
      email: 'admin@dealership.com',
      name: 'Admin User',
      role: 'USER'
    }

    const mockRequest = {
      id: 'req_999',
      userId: 'user_999',
      user: mockUser,
      title: 'Site Maintenance',
      type: 'maintenance',
      status: 'IN_PROGRESS',
      improvementsCompleted: 2,
      completedTasks: []
    }

    const payload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: 'seo_task_999',
        clientId: 'user_999',
        taskType: 'maintenance',
        status: 'completed',
        deliverables: [
          {
            type: 'maintenance',
            title: 'SSL Certificate Update',
            url: 'https://dealership.com'
          }
        ]
      }
    }

    ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
    ;(prisma.requests.update as jest.Mock).mockResolvedValue({ ...mockRequest,
      improvementsCompleted: 3
    })

    const request = createMockRequest(payload)
    const response = await POST(request)

    expect(response.status).toBe(200)
    // Should NOT call contentAddedTemplate for maintenance tasks
    expect(contentAddedTemplate).not.toHaveBeenCalled()
    // Should still send an email, just not the content-specific one
    expect(queueEmailWithPreferences).toHaveBeenCalled()
  })

  it('should handle tasks without deliverables gracefully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'john@dealership.com',
      name: 'John Doe',
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

    const payload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: 'seo_task_no_deliverables',
        clientId: 'user_123',
        taskType: 'page',
        status: 'completed',
        // No deliverables
      }
    }

    ;(prisma.requests.findFirst as jest.Mock).mockResolvedValue(mockRequest)
    ;(prisma.requests.update as jest.Mock).mockResolvedValue(mockRequest)

    const request = createMockRequest(payload)
    const response = await POST(request)

    expect(response.status).toBe(200)
    // Should still create a completed task entry even without deliverables
    expect(prisma.requests.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedTasks: expect.arrayContaining([
            expect.objectContaining({
              title: 'page', // Falls back to task type
              type: 'page',
              url: undefined
            })
          ])
        })
      })
    )
  })
})
