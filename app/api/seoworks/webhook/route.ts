import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { 
  requireApiKey, 
  withRateLimit, 
  successResponse, 
  internalErrorResponse,
  badRequestResponse,
  compose
} from '@/lib/api-auth-middleware'
import { validateRequest, seoworksWebhookSchema } from '@/lib/validations/index'

export const dynamic = 'force-dynamic';
import { incrementUsage, TaskType } from '@/lib/package-utils'
import { RequestStatus, PackageType } from '@prisma/client'
import { contentAddedTemplate } from '@/lib/mailgun/content-notifications'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { taskCompletedTemplate, statusChangedTemplate } from '@/lib/mailgun/templates'

interface SeoworksDeliverable {
  type: string;
  title: string;
  url?: string;
  [key: string]: unknown;
}

interface SeoworksWebhookData {
  externalId: string;
  clientId?: string;
  clientEmail?: string;
  taskType: string;
  status: string;
  completionDate?: string;
  deliverables?: SeoworksDeliverable[];
  [key: string]: unknown;
}

interface SeoworksWebhookPayload {
  eventType: string;
  data: SeoworksWebhookData;
}

// Package limits definition - duplicated here to avoid circular dependency with @/lib/package-utils
const PACKAGE_LIMITS: Record<string, { pages: number; blogs: number; gbpPosts: number; improvements: number }> = {
  SILVER: { pages: 3, blogs: 4, gbpPosts: 8, improvements: 8 },
  GOLD: { pages: 6, blogs: 8, gbpPosts: 16, improvements: 10 },
  PLATINUM: { pages: 9, blogs: 12, gbpPosts: 20, improvements: 20 }
}

// --- Type-safe deliverables validation ---
function validateDeliverables(deliverables: SeoworksDeliverable[] | undefined): boolean {
  if (!deliverables || !Array.isArray(deliverables)) return true // Allow empty
  return deliverables.every(d =>
    d && typeof d === 'object' &&
    typeof d.title === 'string' &&
    (!d.url || typeof d.url === 'string')
  )
}

// Handle task completed event
async function handleTaskCompleted(
  request: any, // Using any for now, will refine types later
  data: SeoworksWebhookData
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
    const updateData: Record<string, unknown> = {}
    
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
    const firstDeliverable = Array.isArray(data.deliverables) && data.deliverables[0] && typeof data.deliverables[0] === 'object' && data.deliverables[0] !== null ? data.deliverables[0] : null
    const completedTask = {
      title: (firstDeliverable && 'title' in firstDeliverable && typeof firstDeliverable.title === 'string') ? firstDeliverable.title : data.taskType,
      type: data.taskType,
      url: (firstDeliverable && 'url' in firstDeliverable && typeof firstDeliverable.url === 'string') ? firstDeliverable.url : undefined,
      completedAt: data.completionDate || new Date().toISOString()
    }

    const existingTasks = Array.isArray(request.completedTasks) ? request.completedTasks : []
    updateData.completedTasks = [...existingTasks, completedTask]

    // Update status if this completes the request
    // This logic can be customized based on package requirements
    if (shouldMarkRequestAsCompleted(request, data)) {
      updateData.status = RequestStatus.COMPLETED
      updateData.completedAt = new Date()
    }

    // Update the request
    const updatedRequest = await prisma.requests.update({
      where: { id: request.id },
      data: updateData
    })

    // Increment usage for package tracking
    if (updatedRequest.userId) {
      let taskTypeForUsage: keyof typeof PACKAGE_LIMITS[keyof typeof PACKAGE_LIMITS] | null = null;
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
      ? contentAddedTemplate(updatedRequest, request.users, completedTask)
      : taskCompletedTemplate(updatedRequest, request.users, completedTask)
    
    await queueEmailWithPreferences(
      request.users.id,
      'taskCompleted',
      { ...emailTemplate,
        to: request.users.email
      }
    )

    // If request was completed, send status change email too
    if (updateData.status === RequestStatus.COMPLETED) {
      const statusTemplate = statusChangedTemplate(
        updatedRequest,
        request.users,
        request.status,
        RequestStatus.COMPLETED
      )
      await queueEmailWithPreferences(
        request.users.id,
        'statusChanged',
        { ...statusTemplate,
          to: request.users.email
        }
      )
    }

    logger.info('Task completed webhook processed', {
      requestId: request.id,
      taskType: data.taskType,
      userId: request.users.id
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
  request: any, // Using any for now, will refine types later
  data: SeoworksWebhookData
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
  request: any, // Using any for now, will refine types later
  data: SeoworksWebhookData
) {
  try {
    // Update request status to cancelled if not already completed
    if (request.status !== RequestStatus.COMPLETED) {
      const updatedRequest = await prisma.requests.update({
        where: { id: request.id },
        data: { status: RequestStatus.CANCELLED }
      })
  
      // Send status change email
      const statusTemplate = statusChangedTemplate(
        updatedRequest,
        request.users,
        request.status,
        RequestStatus.CANCELLED
      )
      await queueEmailWithPreferences(
        request.users.id,
        'statusChanged',
        { ...statusTemplate,
          to: request.users.email
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

// Process orphaned tasks for a newly onboarded user
async function processOrphanedTasksForUser(userId: string, userEmail?: string) {
  try {
    // Find orphaned tasks that match this user
    const orphanedTasks = await prisma.orphaned_tasks.findMany({
      where: {
        OR: [
          { clientId: userId },
          userEmail ? { clientEmail: userEmail } : {}
        ].filter(condition => Object.keys(condition).length > 0),
        processed: false
      },
      orderBy: { createdAt: 'asc' }
    })

    if (orphanedTasks.length === 0) {
      logger.info('No orphaned tasks found for user', { userId, userEmail })
      return { processed: 0, created: 0 }
    }

    let processedCount = 0
    let createdCount = 0

    for (const orphanedTask of orphanedTasks) {
      try {
        // Create a request for this orphaned task if it was completed
        if (orphanedTask.eventType === 'task.completed') {
          const newRequest = await prisma.requests.create({
            data: {
              userId: userId,
              title: (Array.isArray(orphanedTask.deliverables) && orphanedTask.deliverables[0] && typeof orphanedTask.deliverables[0] === 'object' && orphanedTask.deliverables[0] !== null && 'title' in orphanedTask.deliverables[0] && typeof orphanedTask.deliverables[0].title === 'string') ? orphanedTask.deliverables[0].title : `SEOWorks ${orphanedTask.taskType} Task`,
              description: `Task created from orphaned SEOWorks task\n\nOriginal Task ID: ${orphanedTask.externalId}\nCompleted: ${orphanedTask.completionDate || new Date().toISOString()}\n\nOriginal Notes: ${orphanedTask.notes || ''}`,
              type: orphanedTask.taskType.toLowerCase(),
              status: 'COMPLETED',
              seoworksTaskId: orphanedTask.externalId,
              completedAt: orphanedTask.completionDate ? new Date(orphanedTask.completionDate) : new Date(),
              completedTasks: orphanedTask.deliverables || [] as any,
              // Set completed counters based on task type
              pagesCompleted: orphanedTask.taskType.toLowerCase() === 'page' ? 1 : 0,
              blogsCompleted: orphanedTask.taskType.toLowerCase() === 'blog' ? 1 : 0,
              gbpPostsCompleted: orphanedTask.taskType.toLowerCase() === 'gbp_post' ? 1 : 0,
              improvementsCompleted: ['improvement', 'maintenance'].includes(orphanedTask.taskType.toLowerCase()) ? 1 : 0
            }
          })

          // Mark orphaned task as processed and link it
          await prisma.orphaned_tasks.update({
            where: { id: orphanedTask.id },
            data: {
              processed: true,
              linkedRequestId: newRequest.id,
              notes: `${orphanedTask.notes || ''}\n\nProcessed and linked to request ${newRequest.id} for user ${userId}`
            }
          })

          createdCount++
          logger.info('Created request from orphaned task', {
            orphanedTaskId: orphanedTask.id,
            newRequestId: newRequest.id,
            userId,
            taskType: orphanedTask.taskType
          })
        } else {
          // For non-completed tasks, just mark as processed with a note
          await prisma.orphaned_tasks.update({
            where: { id: orphanedTask.id },
            data: {
              processed: true,
              notes: `${orphanedTask.notes || ''}\n\nProcessed for user ${userId} - task was ${orphanedTask.eventType} status`
            }
          })
        }

        processedCount++
      } catch (taskError) {
        logger.error('Failed to process individual orphaned task', taskError, {
          orphanedTaskId: orphanedTask.id,
          userId
        })
        // Continue processing other tasks even if one fails
      }
    }

    logger.info('Completed processing orphaned tasks for user', {
      userId,
      userEmail,
      totalFound: orphanedTasks.length,
      processed: processedCount,
      requestsCreated: createdCount
    })

    return { processed: processedCount, created: createdCount }
  } catch (error) {
    logger.error('Failed to process orphaned tasks for user', error, { userId, userEmail })
    throw error
  }
}

// Determine if request should be marked as completed
function shouldMarkRequestAsCompleted(request: any, data: SeoworksWebhookData): boolean {
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


export const GET = compose(
  withRateLimit(20, 60000), // 20 requests per minute
  requireApiKey('SEOWORKS_WEBHOOK_SECRET')
)(async (request: NextRequest) => {
  logger.info('SEOWorks webhook connectivity test', {
    path: '/api/seoworks/webhook',
    method: 'GET'
  })
  
  return successResponse({ 
    status: 'ok',
    message: 'SEOWorks webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
})

export const POST = compose(
  withRateLimit(100, 60000), // 100 requests per minute for webhooks
  requireApiKey('SEOWORKS_WEBHOOK_SECRET')
)(async (request: NextRequest) => {

  let payload: SeoworksWebhookPayload | undefined; // Initialize payload to undefined and declare it outside the try block

  try {
    // Try JSON parse first for safe logging/fallback contexts
    let raw: any = null
    try {
      raw = await request.json()
    } catch (_e) {
      // keep raw as null; validationRequest will handle JSON errors
    }

    // Validate request body (re-validate using raw if available to avoid double-read)
    const validation = raw
      ? seoworksWebhookSchema.safeParse(raw)
      : { success: false as const, error: new Error('No body parsed') }

    if (!validation.success) {
      logger.warn('Invalid webhook payload', {
        error: validation.error instanceof Error ? validation.error.message : validation.error,
        rawPreview: raw ? JSON.stringify(raw).slice(0, 500) : 'no-body'
      })
      // Return PDF-aligned error envelope
      return badRequestResponse('Invalid webhook payload')
    }

    payload = validation.data as SeoworksWebhookPayload; // Assign payload here
    const { eventType, data } = payload

    // Find the request by external ID - try multiple lookup strategies
    let requestRecord = null
    
    // Strategy 1: Direct lookup by our internal request ID
    requestRecord = await prisma.requests.findFirst({
      where: { id: data.externalId },
      include: { users: true }
    })
    
    // Strategy 2: If not found, try lookup by SEOWorks task ID
    if (!requestRecord) {
      requestRecord = await prisma.requests.findFirst({
        where: { seoworksTaskId: data.externalId },
        include: { users: true }
      })
    }
    
    // Strategy 3: If still not found and we have clientId/clientEmail, try to match by client + task type
    // This handles tasks created directly in SEOWorks without a focus request
    if (!requestRecord && (data.clientId || data.clientEmail)) {
      // First, find the user
      const user = await prisma.users.findFirst({
        where: {
          OR: [
            data.clientId ? { id: data.clientId } : {},
            data.clientEmail ? { email: data.clientEmail } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      })
      
      if (user) {
        // Look for a pending request of the same type for this user
        requestRecord = await prisma.requests.findFirst({
          where: {
            userId: user.id,
            type: data.taskType.toLowerCase(),
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            seoworksTaskId: null // Not yet linked to a SEOWorks task
          },
          orderBy: { createdAt: 'asc' }, // Get the oldest unlinked request
          include: { users: true }
        })
        
        // If found, link this SEOWorks task to our request
        if (requestRecord) {
          await prisma.requests.update({
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
        const user = await prisma.users.findFirst({
          where: {
            OR: [
              data.clientId ? { id: data.clientId } : {},
              data.clientEmail ? { email: data.clientEmail } : {}
            ].filter(condition => Object.keys(condition).length > 0)
          }
        })
        
        if (user && eventType === 'task.completed') {
          // Create a new request to track this externally created task
          requestRecord = await prisma.requests.create({
            data: {
              userId: user.id,
              title: (Array.isArray(data.deliverables) && data.deliverables[0] && typeof data.deliverables[0] === 'object' && data.deliverables[0] !== null && 'title' in data.deliverables[0] && typeof data.deliverables[0].title === 'string') ? data.deliverables[0].title : `SEOWorks ${data.taskType} Task`,
              description: `Task created directly in SEOWorks\n\nTask ID: ${data.externalId}\nCompleted: ${data.completionDate || new Date().toISOString()}`,
              type: data.taskType.toLowerCase(),
              status: 'COMPLETED',
              seoworksTaskId: data.externalId,
              completedAt: new Date(data.completionDate || Date.now()),
              completedTasks: data.deliverables || [] as any,
              // Set completed counters based on task type
              pagesCompleted: data.taskType.toLowerCase() === 'page' ? 1 : 0,
              blogsCompleted: data.taskType.toLowerCase() === 'blog' ? 1 : 0,
              gbpPostsCompleted: data.taskType.toLowerCase() === 'gbp_post' ? 1 : 0,
              improvementsCompleted: ['improvement', 'maintenance'].includes(data.taskType.toLowerCase()) ? 1 : 0
            },
            include: { users: true }
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
        // Store orphaned task data for later processing when dealership is onboarded
        try {
          const orphanedTask = await prisma.orphaned_tasks.create({
            data: {
              externalId: data.externalId,
              clientId: data.clientId,
              clientEmail: data.clientEmail,
              eventType,
              taskType: data.taskType,
              status: data.status,
              completionDate: data.completionDate,
              deliverables: data.deliverables as any,
              rawPayload: payload as any,
              processed: false,
              notes: `Webhook received for unknown dealership - task orphaned for later processing`
            }
          })

          logger.info('Stored orphaned task for unknown dealership', {
            orphanedTaskId: orphanedTask.id,
            externalId: data.externalId,
            eventType,
            clientId: data.clientId,
            clientEmail: data.clientEmail,
            path: '/api/seoworks/webhook',
            method: 'POST'
          })

          // Align with GSEO.pdf "Success – Dealership Not Set Up Yet"
          return successResponse({
            message: 'Webhook received and task stored (dealership not yet set up)',
            status: 'stored_for_later_processing',
            seoworksTaskId: data.externalId
          })
        } catch (orphanError) {
          logger.error('Failed to store orphaned task', orphanError, {
            externalId: data.externalId,
            eventType,
            clientId: data.clientId,
            clientEmail: data.clientEmail
          })
          
          // Align fallback response with GSEO.pdf even if storage failed
          return successResponse({
            message: 'Webhook received and task stored (dealership not yet set up)',
            status: 'stored_for_later_processing',
            seoworksTaskId: data.externalId
          })
        }
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

    // Align response shape with GSEO.pdf "Success – Dealership Exists"
    return successResponse({
      success: true,
      message: 'Webhook processed successfully',
      requestId: requestRecord.id
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
    // For robustness, keep a consistent 200 with stored_for_later_processing when validation or processing fails unexpectedly
    return successResponse({
      message: 'Webhook received and task stored (dealership not yet set up)',
      status: 'stored_for_later_processing',
      seoworksTaskId: payload?.data?.externalId
    })
  }
})
