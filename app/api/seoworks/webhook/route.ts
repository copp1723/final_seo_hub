import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { validateRequest, seoworksWebhookSchema } from '@/lib/validations/index'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { taskCompletedTemplate, statusChangedTemplate } from '@/lib/mailgun/templates'
import { contentAddedTemplate } from '@/lib/mailgun/content-notifications'
import { RequestStatus } from '@prisma/client'
import { incrementUsage, TaskType } from '@/lib/package-utils'
import crypto from 'crypto'

// Timing-safe comparison for API key
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// Verify webhook authentication
function verifyWebhookAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.SEOWORKS_WEBHOOK_SECRET
  
  if (!apiKey || !expectedKey) {
    logger.warn('Missing API key or webhook secret')
    return false
  }
  
  return timingSafeCompare(apiKey, expectedKey)
}

// GET endpoint for testing connectivity
export async function GET(request: NextRequest) {
  if (!verifyWebhookAuth(request)) {
    logger.warn('Webhook GET request with invalid auth', {
      path: request.url,
      headers: Object.fromEntries(request.headers.entries())
    })
    return errorResponse('Unauthorized', 401)
  }
  
  logger.info('SEOWorks webhook connectivity test', {
    path: '/api/seoworks/webhook',
    method: 'GET'
  })
  
  return successResponse({ 
    status: 'ok',
    message: 'SEOWorks webhook endpoint is active'
  })
}

// POST endpoint for receiving webhook events
export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyWebhookAuth(request)) {
    logger.warn('Webhook POST request with invalid auth', {
      path: request.url,
      headers: Object.fromEntries(request.headers.entries())
    })
    return errorResponse('Unauthorized', 401)
  }

  // Validate request body
  const validation = await validateRequest(request, seoworksWebhookSchema)
  if (!validation.success) {
    logger.warn('Invalid webhook payload', {
      error: validation.error
    })
    return validation.error
  }

  const { data: payload } = validation

  try {
    const { eventType, data } = payload

    // Find the request by external ID - try multiple lookup strategies
    let requestRecord = null
    
    // Strategy 1: Direct lookup by our internal request ID
    requestRecord = await prisma.request.findFirst({
      where: { id: data.externalId },
      include: { user: true }
    })
    
    // Strategy 2: If not found, try lookup by SEOWorks task ID
    if (!requestRecord) {
      requestRecord = await prisma.request.findFirst({
        where: { seoworksTaskId: data.externalId },
        include: { user: true }
      })
    }
    
    // Strategy 3: If still not found and we have clientId/clientEmail, try to match by client + task type
    // This handles tasks created directly in SEOWorks without a focus request
    if (!requestRecord && (data.clientId || data.clientEmail)) {
      // First, find the user
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            data.clientId ? { id: data.clientId } : {},
            data.clientEmail ? { email: data.clientEmail } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      })
      
      if (user) {
        // Look for a pending request of the same type for this user
        requestRecord = await prisma.request.findFirst({
          where: {
            userId: user.id,
            type: data.taskType.toLowerCase(),
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            seoworksTaskId: null // Not yet linked to a SEOWorks task
          },
          orderBy: { createdAt: 'asc' }, // Get the oldest unlinked request
          include: { user: true }
        })
        
        // If found, link this SEOWorks task to our request
        if (requestRecord) {
          await prisma.request.update({
            where: { id: requestRecord.id },
            data: { seoworksTaskId: data.externalId }
          })
          logger.info('Linked SEOWorks task to existing request', {
            requestId: requestRecord.id,
            seoworksTaskId: data.externalId,
            userId: user.id
          })
        }
      }
    }

    if (!requestRecord) {
      // Strategy 4: If still no request found, this might be a task created directly in SEOWorks
      // Create a new request to track it if we can identify the user
      if (data.clientId || data.clientEmail) {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              data.clientId ? { id: data.clientId } : {},
              data.clientEmail ? { email: data.clientEmail } : {}
            ].filter(condition => Object.keys(condition).length > 0)
          }
        })
        
        if (user && eventType === 'task.completed') {
          // Create a new request to track this externally created task
          requestRecord = await prisma.request.create({
            data: {
              userId: user.id,
              title: data.deliverables?.[0]?.title || `SEOWorks ${data.taskType} Task`,
              description: `Task created directly in SEOWorks\n\nTask ID: ${data.externalId}\nCompleted: ${data.completionDate || new Date().toISOString()}`,
              type: data.taskType.toLowerCase(),
              status: 'COMPLETED',
              seoworksTaskId: data.externalId,
              completedAt: new Date(data.completionDate || Date.now()),
              completedTasks: data.deliverables || [],
              // Set completed counters based on task type
              pagesCompleted: data.taskType.toLowerCase() === 'page' ? 1 : 0,
              blogsCompleted: data.taskType.toLowerCase() === 'blog' ? 1 : 0,
              gbpPostsCompleted: data.taskType.toLowerCase() === 'gbp_post' ? 1 : 0,
              improvementsCompleted: ['improvement', 'maintenance'].includes(data.taskType.toLowerCase()) ? 1 : 0
            },
            include: { user: true }
          })
          
          logger.info('Created new request for externally created SEOWorks task', {
            requestId: requestRecord.id,
            seoworksTaskId: data.externalId,
            userId: user.id,
            taskType: data.taskType
          })
        }
      }
      
      if (!requestRecord) {
        logger.warn('Request not found and could not create one for webhook', {
          externalId: data.externalId,
          eventType,
          clientId: data.clientId,
          clientEmail: data.clientEmail,
          path: '/api/seoworks/webhook',
          method: 'POST'
        })
        // Still return success to avoid retries from SEOWorks
        return successResponse({
          message: 'Webhook received (no matching request found)',
          eventType,
          externalId: data.externalId,
          clientId: data.clientId,
          clientEmail: data.clientEmail
        })
      }
    }

    // Handle different event types
    switch (eventType) {
      case 'task.completed':
        await handleTaskCompleted(requestRecord, data)
        break
      
      case 'task.updated':
        await handleTaskUpdated(requestRecord, data)
        break
      
      case 'task.cancelled':
        await handleTaskCancelled(requestRecord, data)
        break
      
      default:
        logger.info('Unhandled webhook event type', { eventType })
    }

    logger.info('Successfully processed webhook', {
      requestId: requestRecord.id,
      externalId: data.externalId,
      eventType,
      status: data.status,
      path: '/api/seoworks/webhook',
      method: 'POST'
    })

    return successResponse({
      success: true,
      message: 'Webhook processed successfully',
      eventType,
      requestId: requestRecord.id,
      externalId: data.externalId,
      clientId: data.clientId || requestRecord.userId,
      clientEmail: data.clientEmail || requestRecord.user.email,
      taskType: data.taskType,
      status: data.status
    })
  } catch (error) {
    logger.error('Webhook processing error', error, {
      webhookData: {
        eventType: payload?.eventType,
        externalId: payload?.data?.externalId
      },
      path: '/api/seoworks/webhook',
      method: 'POST'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}

// Validate deliverables structure
function validateDeliverables(deliverables: any): boolean {
  if (!deliverables || !Array.isArray(deliverables)) return true // Allow empty
  return deliverables.every(d => 
    d && typeof d === 'object' && 
    typeof d.title === 'string' &&
    (!d.url || typeof d.url === 'string')
  )
}

// Handle task completed event
async function handleTaskCompleted(
  request: any, // Request with user
  data: any
) {
  try {
    // Validate deliverables format
    if (!validateDeliverables(data.deliverables)) {
      logger.warn('Invalid deliverables format, using fallback', { 
        taskId: data.externalId,
        deliverables: data.deliverables 
      })
      data.deliverables = [] // Use empty array as fallback
    }
    // Update request progress based on task type
    const updateData: any = {}
    
    // Increment the appropriate counter
    switch (data.taskType.toLowerCase()) {
      case 'page':
        updateData.pagesCompleted = { increment: 1 }
        break
      case 'blog':
        updateData.blogsCompleted = { increment: 1 }
        break
      case 'gbp_post':
        updateData.gbpPostsCompleted = { increment: 1 }
        break
      case 'improvement':
      case 'maintenance':
        updateData.improvementsCompleted = { increment: 1 }
        break
    }

    // Add to completed tasks array
    const completedTask = {
      title: data.deliverables?.[0]?.title || data.taskType,
      type: data.taskType,
      url: data.deliverables?.[0]?.url,
      completedAt: data.completionDate || new Date().toISOString()
    }

    const existingTasks = request.completedTasks || []
    updateData.completedTasks = [...existingTasks, completedTask]

    // Update status if this completes the request
    // This logic can be customized based on package requirements
    if (shouldMarkRequestAsCompleted(request, data)) {
      updateData.status = RequestStatus.COMPLETED
      updateData.completedAt = new Date()
    }

    // Update the request
    const updatedRequest = await prisma.request.update({
      where: { id: request.id },
      data: updateData
    })

    // Increment usage for package tracking
    if (updatedRequest.userId) {
      let taskTypeForUsage: TaskType | null = null
      switch (data.taskType.toLowerCase()) {
        case 'page':
          taskTypeForUsage = 'pages'
          break
        case 'blog':
          taskTypeForUsage = 'blogs'
          break
        case 'gbp_post':
          taskTypeForUsage = 'gbpPosts'
          break
        case 'maintenance':
        case 'improvement':
          taskTypeForUsage = 'improvements'
          break
      }

      if (taskTypeForUsage) {
        try {
          await incrementUsage(updatedRequest.userId, taskTypeForUsage)
          logger.info(`Successfully incremented ${taskTypeForUsage} usage for user ${updatedRequest.userId}`)
        } catch (usageError) {
          logger.error(`Failed to increment usage for user ${updatedRequest.userId}`, usageError)
          // Continue processing even if usage tracking fails
        }
      }
    }

    // Send task completion email
    // Use content-specific template for pages, blogs, and GBP posts
    const isContentTask = ['page', 'blog', 'gbp_post', 'gbp-post'].includes(data.taskType.toLowerCase())
    
    const emailTemplate = isContentTask
      ? contentAddedTemplate(updatedRequest, request.user, completedTask)
      : taskCompletedTemplate(updatedRequest, request.user, completedTask)
    
    await queueEmailWithPreferences(
      request.userId,
      'taskCompleted',
      {
        ...emailTemplate,
        to: request.user.email
      }
    )

    // If request was completed, send status change email too
    if (updateData.status === RequestStatus.COMPLETED) {
      const statusTemplate = statusChangedTemplate(
        updatedRequest,
        request.user,
        request.status,
        RequestStatus.COMPLETED
      )
      await queueEmailWithPreferences(
        request.userId,
        'statusChanged',
        {
          ...statusTemplate,
          to: request.user.email
        }
      )
    }

    logger.info('Task completed webhook processed', {
      requestId: request.id,
      taskType: data.taskType,
      userId: request.userId
    })
  } catch (error) {
    logger.error('Error handling task completed', error, {
      requestId: request.id,
      taskType: data.taskType
    })
    throw error
  }
}

// Handle task updated event
async function handleTaskUpdated(
  request: any,
  data: any
) {
  // For now, just log the update
  logger.info('Task updated webhook received', {
    requestId: request.id,
    taskType: data.taskType,
    status: data.status
  })
}

// Handle task cancelled event
async function handleTaskCancelled(
  request: any,
  data: any
) {
  try {
    // Update request status to cancelled if not already completed
    if (request.status !== RequestStatus.COMPLETED) {
      const updatedRequest = await prisma.request.update({
        where: { id: request.id },
        data: { status: RequestStatus.CANCELLED }
      })

      // Send status change email
      const statusTemplate = statusChangedTemplate(
        updatedRequest,
        request.user,
        request.status,
        RequestStatus.CANCELLED
      )
      await queueEmailWithPreferences(
        request.userId,
        'statusChanged',
        {
          ...statusTemplate,
          to: request.user.email
        }
      )
    }

    logger.info('Task cancelled webhook processed', {
      requestId: request.id,
      taskType: data.taskType
    })
  } catch (error) {
    logger.error('Error handling task cancelled', error, {
      requestId: request.id,
      taskType: data.taskType
    })
    throw error
  }
}

// Determine if request should be marked as completed
function shouldMarkRequestAsCompleted(request: any, data: any): boolean {
  // This is a simplified logic - adjust based on your business rules
  // For example, check if all required tasks for the package are completed
  
  if (!request.packageType) {
    // Single task request - mark as completed
    return true
  }

  // Package-based logic (customize based on your packages)
  const packageRequirements: Record<string, { pages: number; blogs: number; gbpPosts: number }> = {
    SILVER: { pages: 1, blogs: 2, gbpPosts: 4 },
    GOLD: { pages: 2, blogs: 4, gbpPosts: 8 },
    PLATINUM: { pages: 4, blogs: 8, gbpPosts: 16 }
  }

  const requirements = packageRequirements[request.packageType]
  if (!requirements) return false

  // Check if all requirements are met
  return (
    request.pagesCompleted >= requirements.pages &&
    request.blogsCompleted >= requirements.blogs &&
    request.gbpPostsCompleted >= requirements.gbpPosts
  )
}