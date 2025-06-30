import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { validateRequest } from '@/lib/validations'
import { seoworksWebhookSchema } from '@/lib/validations/webhook'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { taskCompletedTemplate, statusChangedTemplate } from '@/lib/mailgun/templates'
import { RequestStatus } from '@prisma/client'
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

    // Find the request by external ID
    const requestRecord = await prisma.request.findFirst({
      where: { id: data.externalId },
      include: { user: true }
    })

    if (!requestRecord) {
      logger.warn('Request not found for webhook', {
        externalId: data.externalId,
        eventType
      })
      return errorResponse('Request not found', 404)
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

    return successResponse({ 
      message: 'Webhook processed successfully',
      eventType 
    })
  } catch (error) {
    logger.error('Error processing webhook', error, {
      eventType: payload.eventType,
      externalId: payload.data.externalId
    })
    return errorResponse('Failed to process webhook', 500)
  }
}

// Handle task completed event
async function handleTaskCompleted(
  request: any, // Request with user
  data: any
) {
  try {
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

    // Send task completion email
    const emailTemplate = taskCompletedTemplate(updatedRequest, request.user, completedTask)
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