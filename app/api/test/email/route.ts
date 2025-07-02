import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { sendEmail } from '@/lib/mailgun/client'
import { 
  welcomeEmailTemplate, 
  requestCreatedTemplate,
  statusChangedTemplate,
  taskCompletedTemplate,
  weeklySummaryTemplate
} from '@/lib/mailgun/templates'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { validateRequest } from '@/lib/validations'

// Only available in development
const isDevelopment = process.env.NODE_ENV === 'development'

const testEmailSchema = z.object({
  type: z.enum(['welcome', 'requestCreated', 'statusChanged', 'taskCompleted', 'weeklySummary']),
  userId: z.string().optional(),
  requestId: z.string().optional(),
  to: z.string().email().optional() // Override recipient for testing
})

export async function POST(request: NextRequest) {
  if (!isDevelopment) {
    return errorResponse('Test endpoint only available in development', 404)
  }

  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Only allow admins to test emails
  if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Unauthorized', 403)
  }

  const validation = await validateRequest(request, testEmailSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  
  try {
    let emailTemplate: { subject: string; html: string } | null = null
    let testUser: any = authResult.user
    let testRequest = null

    // Get test data if IDs provided
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId }
      })
      if (user) testUser = user
    }

    if (data.requestId) {
      testRequest = await prisma.request.findUnique({
        where: { id: data.requestId },
        include: { user: true }
      })
    }

    // Generate appropriate template
    switch (data.type) {
      case 'welcome':
        emailTemplate = welcomeEmailTemplate(testUser)
        break
        
      case 'requestCreated':
        if (!testRequest) {
          // Create mock request
          testRequest = {
            id: 'test-123',
            title: 'Test SEO Content Request',
            description: 'This is a test request for email template preview',
            type: 'blog',
            priority: 'HIGH',
            status: 'PENDING',
            userId: testUser.id,
            user: testUser,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        }
        emailTemplate = requestCreatedTemplate(testRequest, testRequest.user || testUser)
        break
        
      case 'statusChanged':
        if (!testRequest) {
          return errorResponse('Request ID required for status change email', 400)
        }
        emailTemplate = statusChangedTemplate(
          testRequest,
          testRequest.user || testUser,
          'PENDING',
          'IN_PROGRESS'
        )
        break
        
      case 'taskCompleted':
        if (!testRequest) {
          return errorResponse('Request ID required for task completed email', 400)
        }
        emailTemplate = taskCompletedTemplate(
          testRequest,
          testRequest.user || testUser,
          {
            title: 'Test Blog Post',
            type: 'blog',
            url: 'https://example.com/test-blog'
          }
        )
        break
        
      case 'weeklySummary':
        emailTemplate = weeklySummaryTemplate(testUser, {
          totalRequests: 5,
          completedRequests: 2,
          inProgressRequests: 2,
          completedTasks: [
            {
              title: 'SEO Best Practices Guide',
              type: 'blog',
              completedAt: new Date()
            },
            {
              title: 'Homepage Optimization',
              type: 'page',
              completedAt: new Date()
            }
          ],
          upcomingTasks: [
            {
              title: 'Product Page SEO',
              type: 'page',
              priority: 'HIGH'
            }
          ]
        })
        break
    }

    if (!emailTemplate) {
      return errorResponse('Failed to generate email template', 500)
    }

    // Send test email
    const recipient = data.to || testUser.email
    const success = await sendEmail({
      to: recipient,
      subject: `[TEST] ${emailTemplate.subject}`,
      html: emailTemplate.html,
      tags: ['test', data.type]
    })

    logger.info('Test email sent', {
      type: data.type,
      to: recipient,
      success
    })

    return successResponse({
      message: 'Test email sent',
      type: data.type,
      to: recipient,
      success
    })
  } catch (error) {
    logger.error('Error sending test email', error, {
      type: data.type
    })
    return errorResponse('Failed to send test email', 500)
  }
}