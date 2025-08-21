import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { taskCompletedTemplate, statusChangedTemplate } from '@/lib/mailgun/templates'
import { contentAddedTemplate } from '@/lib/mailgun/content-notifications'
import { RequestStatus } from '@prisma/client'
import { incrementUsage, incrementDealershipUsage, TaskType } from '@/lib/package-utils'

// --- Types for SEOWorks Webhook Payloads ---
export interface SeoworksDeliverable {
  type: string;
  title: string;
  url?: string;
  [key: string]: unknown;
}

export interface SeoworksWebhookData {
  externalId: string;
  clientId?: string;
  clientEmail?: string;
  taskType: string;
  status: string;
  completionDate?: string;
  deliverables?: SeoworksDeliverable[];
  [key: string]: unknown;
}

export interface SeoworksWebhookPayload {
  eventType: string;
  data: SeoworksWebhookData;
}

// --- Type-safe deliverables validation ---
export function validateDeliverables(deliverables: SeoworksDeliverable[] | undefined): boolean {
  if (!deliverables || !Array.isArray(deliverables)) return true // Allow empty
  return deliverables.every(d =>
    d && typeof d === 'object' &&
    typeof d.title === 'string' &&
    (!d.url || typeof d.url === 'string')
  )
}

// Handle task completed event
export async function handleTaskCompleted(
  request: { id: string; status: string; completedTasks: any; userId: string; packageType?: string | null; pagesCompleted: number; blogsCompleted: number; gbpPostsCompleted: number; improvementsCompleted: number; users: any },
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
      case 'seochange':
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
        case 'seochange':
          taskTypeForUsage = 'improvements'
          break
      }

      if (taskTypeForUsage) {
        try {
          // Prefer incrementing by dealership when available (some requests are created without a user)
          if (updatedRequest.dealershipId) {
            await incrementDealershipUsage(updatedRequest.dealershipId, taskTypeForUsage)
            logger.info(`Successfully incremented ${taskTypeForUsage} usage for dealership ${updatedRequest.dealershipId}`)
          } else if (updatedRequest.userId) {
            await incrementUsage(updatedRequest.userId, taskTypeForUsage)
            logger.info(`Successfully incremented ${taskTypeForUsage} usage for user ${updatedRequest.userId}`)
          } else {
            logger.warn('No dealershipId or userId available to increment usage for request', { requestId: updatedRequest.id })
          }
        } catch (usageError) {
          logger.error('Failed to increment usage for request', usageError)
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
export async function handleTaskUpdated(
  request: { id: string; status: string; users: any },
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
export async function handleTaskCancelled(
  request: { id: string; status: string; users: any },
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

// Determine if request should be marked as completed
export function shouldMarkRequestAsCompleted(request: any, data: SeoworksWebhookData): boolean {
  // This is a simplified logic - adjust based on your business rules
  // For example, check if all required tasks for the package are completed
  
  if (!request.packageType) {
    // Single task request - mark as completed
    return true
  }

  // Package-based logic using hard-coded limits to avoid async/await
  const packageRequirements: Record<string, { pages: number; blogs: number; gbpPosts: number }> = {
    SILVER: { pages: 2, blogs: 2, gbpPosts: 4 },
    GOLD: { pages: 4, blogs: 4, gbpPosts: 8 },
    PLATINUM: { pages: 6, blogs: 6, gbpPosts: 12 }
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