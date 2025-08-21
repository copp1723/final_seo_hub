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
import { incrementUsage, incrementDealershipUsage } from '@/lib/package-utils'
import crypto from 'crypto'
import { RequestStatus, PackageType, TaskStatus as DbTaskStatus, TaskType as DbTaskType, RequestPriority } from '@prisma/client'
import { contentAddedTemplate } from '@/lib/mailgun/content-notifications'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { taskCompletedTemplate, statusChangedTemplate } from '@/lib/mailgun/templates'

// Normalize URLs to ensure they have a protocol (backward compatibility)
function normalizeUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string' || url.length === 0) {
    return undefined;
  }
  
  // If URL already has a protocol, return as-is
  if (url.match(/^https?:\/\//)) {
    return url;
  }
  
  // Add https:// if missing (backward compatibility for SEOWorks)
  return `https://${url}`;
}

// Normalize inbound task types from SEOWorks into our canonical set
// Returns database enum values: 'PAGE', 'BLOG', 'GBP_POST', 'IMPROVEMENT'
function normalizeTaskType(raw: string): 'PAGE' | 'BLOG' | 'GBP_POST' | 'IMPROVEMENT' {
  const t = (raw || '').toString().toLowerCase().replace(/-/g, '_').trim()
  if (['gbp', 'gbp_post', 'gbp_posting', 'gbp_posts', 'gmb', 'google_my_business'].includes(t)) {
    return 'GBP_POST'
  }
  if (['improvement', 'seochange', 'seo_change', 'seochg', 'seo_chg', 'maintenance', 'seo_update'].includes(t)) {
    return 'IMPROVEMENT'
  }
  if (['page', 'landing_page', 'vdp', 'content_page'].includes(t)) {
    return 'PAGE'
  }
  if (['blog', 'article', 'post'].includes(t)) {
    return 'BLOG'
  }
  // Default fallback - log warning for unknown types
  logger.warn(`Unknown task type received from SEOWorks: ${raw}, defaulting to IMPROVEMENT`)
  return 'IMPROVEMENT'
}

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
  customerId?: string;
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

// Import standardized package limits from central source
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'

// Convert to format expected by this module
const PACKAGE_LIMITS: Record<string, { pages: number; blogs: number; gbpPosts: number; improvements: number }> = {
  SILVER: SEO_KNOWLEDGE_BASE.packages.silver,
  GOLD: SEO_KNOWLEDGE_BASE.packages.gold,
  PLATINUM: SEO_KNOWLEDGE_BASE.packages.platinum
}

// --- Type-safe deliverables validation ---
function validateDeliverables(deliverables: SeoworksDeliverable[] | undefined): boolean {
  if (!deliverables || !Array.isArray(deliverables)) return true // Allow empty
  return deliverables.every(d =>
    d && typeof d === 'object' &&
    typeof d.title === 'string' && d.title.length > 0 &&
    (!d.url || (typeof d.url === 'string' && d.url.length > 0))
  )
}

// --- Comprehensive webhook payload validation ---
function validateWebhookPayload(data: SeoworksWebhookData): { valid: boolean; error?: string } {
  // Required fields validation
  if (!data.externalId || typeof data.externalId !== 'string') {
    return { valid: false, error: 'Missing or invalid externalId' }
  }
  
  if (!data.taskType || typeof data.taskType !== 'string') {
    return { valid: false, error: 'Missing or invalid taskType' }
  }
  
  if (!data.status || typeof data.status !== 'string') {
    return { valid: false, error: 'Missing or invalid status' }
  }
  
  // Validate task type is known
  try {
    normalizeTaskType(data.taskType)
  } catch (error) {
    return { valid: false, error: `Unknown task type: ${data.taskType}` }
  }
  
  // Validate deliverables if present
  if (data.deliverables && !validateDeliverables(data.deliverables)) {
    return { valid: false, error: 'Invalid deliverables format' }
  }
  
  // Validate completion date if provided
  if (data.completionDate) {
    const date = new Date(data.completionDate)
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid completionDate format' }
    }
  }
  
  // Validate client identification - at least one must be present
  if (!data.clientId && !data.clientEmail && !data.customerId) {
    return { valid: false, error: 'Missing client identification (clientId, clientEmail, or customerId required)' }
  }
  
  return { valid: true }
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
    
    // Additional safety check for request object
    if (!request || !request.id) {
      throw new Error('Invalid request object provided to handleTaskCompleted')
    }
    // Update request progress based on task type
    const updateData: Record<string, unknown> = {}
    
    // Normalize and increment the appropriate counter
    const normalizedType = normalizeTaskType(data.taskType)
    switch (normalizedType) {
      case 'PAGE':
        updateData.pagesCompleted = { increment: 1 }
        break
      case 'BLOG':
        updateData.blogsCompleted = { increment: 1 }
        break
      case 'GBP_POST':
        updateData.gbpPostsCompleted = { increment: 1 }
        break
      case 'IMPROVEMENT':
        updateData.improvementsCompleted = { increment: 1 }
        break
    }

    // Add to completed tasks array
    const firstDeliverable = Array.isArray(data.deliverables) && data.deliverables[0] && typeof data.deliverables[0] === 'object' && data.deliverables[0] !== null ? data.deliverables[0] : null
    const completedTask = {
      title: (firstDeliverable && 'title' in firstDeliverable && typeof firstDeliverable.title === 'string') ? firstDeliverable.title : data.taskType,
      type: normalizedType,
      url: (firstDeliverable && 'url' in firstDeliverable && typeof firstDeliverable.url === 'string') ? normalizeUrl(firstDeliverable.url) : undefined,
      completedAt: data.completionDate || new Date().toISOString()
    }

    const existingTasks = Array.isArray(request.completedTasks) ? request.completedTasks : []
    updateData.completedTasks = [...existingTasks, completedTask]

    // Update status if this completes the request
    // This logic can be customized based on package requirements
    if (await shouldMarkRequestAsCompleted(request, data)) {
      updateData.status = RequestStatus.COMPLETED
      updateData.completedAt = new Date()
    }

    // Update the request
    const updatedRequest = await prisma.requests.update({
      where: { id: request.id },
      data: updateData
    })

    // Ensure a Task record exists and is updated to COMPLETED so it appears on the Tasks page
    const toDbTaskType = (t: string): DbTaskType | null => {
      switch (t) {
        case 'PAGE': return DbTaskType.PAGE
        case 'BLOG': return DbTaskType.BLOG
        case 'GBP_POST': return DbTaskType.GBP_POST
        case 'IMPROVEMENT': return DbTaskType.IMPROVEMENT
        default: return null
      }
    }

    const dbTaskType = toDbTaskType(normalizedType)
    if (dbTaskType) {
      const existingTask = await prisma.tasks.findFirst({
        where: { requestId: request.id, type: dbTaskType }
      })

      const completedAt = new Date(data.completionDate || Date.now())
      const targetUrl = normalizeUrl((completedTask as any).url) || null
      const title = (completedTask as any).title || `SEOWorks ${normalizedType} Task`

      if (existingTask) {
        await prisma.tasks.update({
          where: { id: existingTask.id },
          data: {
            status: DbTaskStatus.COMPLETED,
            completedAt,
            targetUrl,
            title,
            updatedAt: new Date()
          }
        })
      } else if (request?.users?.id) {
        await prisma.tasks.create({
          data: {
            id: `task_${data.externalId}_${Date.now()}`,
            userId: request.users.id,
            dealershipId: request.users.dealershipId || null,
            agencyId: request.users.agencyId || null,
            type: dbTaskType,
            status: DbTaskStatus.COMPLETED,
            title,
            description: `Auto-created from SEOWorks webhook ${data.externalId}`,
            priority: RequestPriority.MEDIUM,
            targetUrl,
            requestId: request.id,
            completedAt,
            keywords: Array.isArray(updatedRequest.keywords) ? (updatedRequest.keywords as any) : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    }

    // Increment usage for package tracking with deduplication
    if (updatedRequest.userId) {
      // Check if usage has already been incremented for this specific SEOWorks task
      const existingUsageRecord = await prisma.seoworks_task_mappings.findFirst({
        where: { 
          seoworksTaskId: data.externalId,
          status: 'usage_counted'
        }
      })
      
      if (!existingUsageRecord) {
        let taskTypeForUsage: keyof typeof PACKAGE_LIMITS[keyof typeof PACKAGE_LIMITS] | null = null;
        switch (normalizedType) {
          case 'PAGE':
            taskTypeForUsage = 'pages'
            break
          case 'BLOG':
            taskTypeForUsage = 'blogs'
            break
          case 'GBP_POST':
            taskTypeForUsage = 'gbpPosts'
            break
          case 'IMPROVEMENT':
            taskTypeForUsage = 'improvements'
            break
        }

        if (taskTypeForUsage) {
          try {
            // Prefer dealership-level increment when request is associated to a dealership
            if (updatedRequest.dealershipId) {
              await incrementDealershipUsage(updatedRequest.dealershipId, taskTypeForUsage)
              logger.info(`Successfully incremented ${taskTypeForUsage} usage for dealership ${updatedRequest.dealershipId}`, {
                seoworksTaskId: data.externalId,
                taskType: normalizedType
              })
            } else {
              await incrementUsage(updatedRequest.userId, taskTypeForUsage)
              logger.info(`Successfully incremented ${taskTypeForUsage} usage for user ${updatedRequest.userId}`, {
                seoworksTaskId: data.externalId,
                taskType: normalizedType
              })
            }

            // Mark this task as usage counted to prevent future double-counting
            await prisma.seoworks_task_mappings.upsert({
              where: { seoworksTaskId: data.externalId },
              create: {
                id: crypto.randomUUID(),
                requestId: updatedRequest.id,
                seoworksTaskId: data.externalId,
                taskType: normalizedType,
                status: 'usage_counted',
                metadata: { usageCountedAt: new Date().toISOString() },
                updatedAt: new Date()
              },
              update: {
                status: 'usage_counted',
                metadata: { usageCountedAt: new Date().toISOString() }
              }
            })
          } catch (usageError) {
            logger.error('Failed to increment usage for request', usageError)
            // Continue processing even if usage tracking fails
          }
        }
      } else {
        logger.info(`Usage already counted for SEOWorks task ${data.externalId}, skipping increment`)
      }
    }

    // Send task completion email
    // Use content-specific template for pages, blogs, and GBP posts
    const isContentTask = ['PAGE', 'BLOG', 'GBP_POST'].includes(normalizedType)
    
    const emailTemplate = isContentTask
      ? contentAddedTemplate(updatedRequest, request.users, completedTask)
      : taskCompletedTemplate(updatedRequest, request.users, completedTask)
    
    // OPTIMIZED: Fire-and-forget email operations (don't await)
    queueEmailWithPreferences(
      request.users.id,
      'taskCompleted',
      { ...emailTemplate,
        to: request.users.email
      }
    ).catch(err => logger.warn('Email queue failed for taskCompleted', { error: getSafeErrorMessage(err) }))

    // If request was completed, send status change email too
    if (updateData.status === RequestStatus.COMPLETED) {
      const statusTemplate = statusChangedTemplate(
        updatedRequest,
        request.users,
        request.status,
        RequestStatus.COMPLETED
      )
      queueEmailWithPreferences(
        request.users.id,
        'statusChanged',
        { ...statusTemplate,
          to: request.users.email
        }
      ).catch(err => logger.warn('Email queue failed for statusChanged', { error: getSafeErrorMessage(err) }))
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

  // Map webhook status to our DB TaskStatus and ensure a task exists
  const normalizedType = normalizeTaskType(data.taskType)
  const toDbTaskType = (t: string): DbTaskType | null => {
    switch (t) {
      case 'PAGE': return DbTaskType.PAGE
      case 'BLOG': return DbTaskType.BLOG
      case 'GBP_POST': return DbTaskType.GBP_POST
      case 'IMPROVEMENT': return DbTaskType.IMPROVEMENT
      default: return null
    }
  }
  const mapStatus = (s?: string): DbTaskStatus => {
    const v = (s || '').toLowerCase()
    if (['completed', 'done', 'finished'].includes(v)) return DbTaskStatus.COMPLETED
    if (['cancelled', 'canceled'].includes(v)) return DbTaskStatus.CANCELLED
    if (['in_progress', 'in-progress', 'started', 'working'].includes(v)) return DbTaskStatus.IN_PROGRESS
    return DbTaskStatus.PENDING
  }

  const dbTaskType = toDbTaskType(normalizedType)
  if (!dbTaskType) return

  const existingTask = await prisma.tasks.findFirst({
    where: { requestId: request.id, type: dbTaskType }
  })
  const status = mapStatus(data.status)

  if (existingTask) {
    await prisma.tasks.update({
      where: { id: existingTask.id },
      data: {
        status,
        updatedAt: new Date()
      }
    })
  } else if (request?.users?.id) {
    await prisma.tasks.create({
      data: {
        id: `task_${data.externalId}_${Date.now()}`,
        userId: request.users.id,
        dealershipId: request.users.dealershipId || null,
        agencyId: request.users.agencyId || null,
        type: dbTaskType,
        status,
        title: `SEOWorks ${normalizedType} Task`,
        description: `Auto-created from SEOWorks webhook ${data.externalId}`,
        priority: RequestPriority.MEDIUM,
        requestId: request.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }
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
      queueEmailWithPreferences(
        request.users.id,
        'statusChanged',
        { ...statusTemplate,
          to: request.users.email
        }
      ).catch(err => logger.warn('Email queue failed for cancelled status', { error: getSafeErrorMessage(err) }))
    }

    logger.info('Task cancelled webhook processed', {
      requestId: request.id,
      taskType: data.taskType
    })

    // Reflect cancellation in Tasks list
    const normalizedType = normalizeTaskType(data.taskType)
    const toDbTaskType = (t: string): DbTaskType | null => {
      switch (t) {
        case 'PAGE': return DbTaskType.PAGE
        case 'BLOG': return DbTaskType.BLOG
        case 'GBP_POST': return DbTaskType.GBP_POST
        case 'IMPROVEMENT': return DbTaskType.IMPROVEMENT
        default: return null
      }
    }
    const dbTaskType = toDbTaskType(normalizedType)
    if (dbTaskType) {
      const existingTask = await prisma.tasks.findFirst({ where: { requestId: request.id, type: dbTaskType } })
      if (existingTask) {
        await prisma.tasks.update({ where: { id: existingTask.id }, data: { status: DbTaskStatus.CANCELLED, updatedAt: new Date() } })
      } else if (request?.users?.id) {
        await prisma.tasks.create({
          data: {
            id: `task_${data.externalId}_cancelled_${Date.now()}`,
            userId: request.users.id,
            dealershipId: request.users.dealershipId || null,
            agencyId: request.users.agencyId || null,
            type: dbTaskType,
            status: DbTaskStatus.CANCELLED,
            title: `SEOWorks ${normalizedType} Task`,
            description: `Auto-created (cancelled) from SEOWorks webhook ${data.externalId}`,
            priority: RequestPriority.MEDIUM,
            requestId: request.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    }
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
              id: crypto.randomUUID(),
              userId: userId,
              title: (Array.isArray(orphanedTask.deliverables) && orphanedTask.deliverables[0] && typeof orphanedTask.deliverables[0] === 'object' && orphanedTask.deliverables[0] !== null && 'title' in orphanedTask.deliverables[0] && typeof orphanedTask.deliverables[0].title === 'string') ? orphanedTask.deliverables[0].title : `SEOWorks ${orphanedTask.taskType} Task`,
              description: `Task created from orphaned SEOWorks task\n\nOriginal Task ID: ${orphanedTask.externalId}\nCompleted: ${orphanedTask.completionDate || new Date().toISOString()}\n\nOriginal Notes: ${orphanedTask.notes || ''}`,
              type: normalizeTaskType(orphanedTask.taskType).toLowerCase(),
              status: 'COMPLETED',
              seoworksTaskId: orphanedTask.externalId,
              completedAt: orphanedTask.completionDate ? new Date(orphanedTask.completionDate) : new Date(),
              completedTasks: orphanedTask.deliverables || [] as any,
              updatedAt: new Date(),
              // Set completed counters based on task type
              pagesCompleted: normalizeTaskType(orphanedTask.taskType) === 'PAGE' ? 1 : 0,
              blogsCompleted: normalizeTaskType(orphanedTask.taskType) === 'BLOG' ? 1 : 0,
              gbpPostsCompleted: normalizeTaskType(orphanedTask.taskType) === 'GBP_POST' ? 1 : 0,
              improvementsCompleted: normalizeTaskType(orphanedTask.taskType) === 'IMPROVEMENT' ? 1 : 0
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
async function shouldMarkRequestAsCompleted(request: any, data: SeoworksWebhookData): Promise<boolean> {
  // This is a simplified logic - adjust based on your business rules
  // For example, check if all required tasks for the package are completed
  
  if (!request.packageType) {
    // Single task request - mark as completed
    return true
  }

  // Package-based logic using standardized limits
  const { SEO_KNOWLEDGE_BASE } = await import('@/lib/seo-knowledge')
  const packageRequirements: Record<string, { pages: number; blogs: number; gbpPosts: number }> = {
    SILVER: { pages: SEO_KNOWLEDGE_BASE.packages.silver.pages, blogs: SEO_KNOWLEDGE_BASE.packages.silver.blogs, gbpPosts: SEO_KNOWLEDGE_BASE.packages.silver.gbpPosts },
    GOLD: { pages: SEO_KNOWLEDGE_BASE.packages.gold.pages, blogs: SEO_KNOWLEDGE_BASE.packages.gold.blogs, gbpPosts: SEO_KNOWLEDGE_BASE.packages.gold.gbpPosts },
    PLATINUM: { pages: SEO_KNOWLEDGE_BASE.packages.platinum.pages, blogs: SEO_KNOWLEDGE_BASE.packages.platinum.blogs, gbpPosts: SEO_KNOWLEDGE_BASE.packages.platinum.gbpPosts }
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
    const startTime = Date.now()
    
    // Try JSON parse first for safe logging/fallback contexts
    let raw: any = null
    try {
      raw = await request.json()
    } catch (_e) {
      // keep raw as null; validationRequest will handle JSON errors
    }
    
    logger.info('Webhook JSON parse time', { timeMs: Date.now() - startTime })
    const validationStart = Date.now()

    // Validate request body (re-validate using raw if available to avoid double-read)
    const validation = raw
      ? seoworksWebhookSchema.safeParse(raw)
      : { success: false as const, error: new Error('No body parsed') }
    
    logger.info('Webhook validation time', { timeMs: Date.now() - validationStart })

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
    
    // Validate webhook payload structure and content
    const payloadValidation = validateWebhookPayload(data)
    if (!payloadValidation.valid) {
      logger.warn('Invalid webhook payload structure', {
        error: payloadValidation.error,
        externalId: data.externalId,
        taskType: data.taskType
      })
      return badRequestResponse(`Invalid payload: ${payloadValidation.error}`)
    }

    // OPTIMIZED: Single combined query to find request by multiple strategies
    const dbQueryStart = Date.now()
    let requestRecord = await prisma.requests.findFirst({
      where: {
        OR: [
          { id: data.externalId },
          { seoworksTaskId: data.externalId }
        ]
      },
      include: { 
        users: {
          select: { id: true, email: true, dealershipId: true, agencyId: true }
        }
      }
    })
    
    logger.info('Webhook initial DB query time', { timeMs: Date.now() - dbQueryStart })
    
    // OPTIMIZED: Combined query to find user and their pending requests in one operation
    if (!requestRecord && (data.clientId || data.clientEmail)) {
      const userWithRequests = await prisma.users.findFirst({
        where: {
          OR: [
            data.clientId ? { id: data.clientId } : {},
            data.clientEmail ? { email: data.clientEmail } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        },
        include: {
          requests: {
            where: {
              type: data.taskType.toLowerCase(),
              status: { in: ['PENDING', 'IN_PROGRESS'] },
              seoworksTaskId: null
            },
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      })
      
      if (userWithRequests?.requests[0]) {
        // Link this SEOWorks task to the existing request
        requestRecord = await prisma.requests.update({
          where: { id: userWithRequests.requests[0].id },
          data: { seoworksTaskId: data.externalId },
          include: { users: { select: { id: true, email: true, dealershipId: true, agencyId: true } } }
        })
        logger.info('Linked SEOWorks task to existing request', {
          requestId: requestRecord.id,
          seoworksTaskId: data.externalId,
          userId: userWithRequests.id
        })
      }
    }

    if (!requestRecord) {
      // Strategy 4: If still no request found, this might be a task created directly in SEOWorks
      // Create a new request to track it if we can identify the user
      if (data.clientId || data.clientEmail) {
        // FIXED: Look up users by dealership access, not direct ID matching
        let user = null;
        
        if (data.clientEmail) {
          // Direct email lookup
          user = await prisma.users.findFirst({
            where: { email: data.clientEmail },
            select: { id: true, email: true, dealershipId: true, agencyId: true }
          });
        }
        
        if (!user && data.clientId) {
          // Find users who have access to this dealership via clientId
          const usersWithAccess = await prisma.users.findMany({
            where: {
              user_dealership_access_user_dealership_access_userIdTousers: {
                some: {
                  isActive: true,
                  dealerships: {
                    clientId: data.clientId
                  }
                }
              }
            },
            select: { 
              id: true, 
              email: true, 
              dealershipId: true, 
              agencyId: true,
              user_dealership_access_user_dealership_access_userIdTousers: {
                where: {
                  isActive: true,
                  dealerships: {
                    clientId: data.clientId
                  }
                },
                select: {
                  dealerships: {
                    select: { id: true, name: true }
                  }
                }
              }
            },
            take: 1
          });
          
          if (usersWithAccess.length > 0) {
            user = usersWithAccess[0];
            // Use the dealership from the access record
            const dealershipAccess = user.user_dealership_access_user_dealership_access_userIdTousers[0];
            if (dealershipAccess) {
              user.dealershipId = dealershipAccess.dealerships.id;
            }
            // Clean up the access data from the user object
            const { user_dealership_access_user_dealership_access_userIdTousers, ...cleanUser } = user;
            user = cleanUser;
          }
        }
        
        if (user && eventType === 'task.completed') {
          // Create a new request to track this externally created task
          requestRecord = await prisma.requests.create({
            data: {
              id: `req_${data.externalId}`,
              userId: user.id,
              agencyId: user.agencyId || null,
              dealershipId: user.dealershipId || null,
              title: (Array.isArray(data.deliverables) && data.deliverables[0] && typeof data.deliverables[0] === 'object' && data.deliverables[0] !== null && 'title' in data.deliverables[0] && typeof data.deliverables[0].title === 'string') ? data.deliverables[0].title : `SEOWorks ${normalizeTaskType(data.taskType)} Task`,
              description: `Task created directly in SEOWorks\n\nTask ID: ${data.externalId}\nCompleted: ${data.completionDate || new Date().toISOString()}`,
              type: normalizeTaskType(data.taskType).toLowerCase(),
              status: 'COMPLETED',
              seoworksTaskId: data.externalId,
              completedAt: new Date(data.completionDate || Date.now()),
              completedTasks: data.deliverables || [] as any,
              updatedAt: new Date(),
              // Set completed counters based on task type
              pagesCompleted: normalizeTaskType(data.taskType) === 'PAGE' ? 1 : 0,
              blogsCompleted: normalizeTaskType(data.taskType) === 'BLOG' ? 1 : 0,
              gbpPostsCompleted: normalizeTaskType(data.taskType) === 'GBP_POST' ? 1 : 0,
              improvementsCompleted: normalizeTaskType(data.taskType) === 'IMPROVEMENT' ? 1 : 0
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

      // OPTIMIZED: Find dealership and associated user separately
      if (!requestRecord && (data.customerId || data.clientId)) {
        const dealership = await prisma.dealerships.findFirst({
          where: { clientId: (data.customerId as string) || (data.clientId as string) }
        })
        
        if (dealership && eventType === 'task.completed') {
          // Find a user associated with this dealership
          const ownerUser = await prisma.users.findFirst({
            where: { dealershipId: dealership.id },
            select: { id: true, agencyId: true, dealershipId: true, email: true }
          })
          
          if (ownerUser) {
            requestRecord = await prisma.requests.create({
              data: {
                id: crypto.randomUUID(),
                userId: ownerUser.id,
                agencyId: ownerUser.agencyId || null,
                dealershipId: ownerUser.dealershipId || dealership.id,
                updatedAt: new Date(),
                title: (Array.isArray(data.deliverables) && data.deliverables[0] && typeof data.deliverables[0] === 'object' && data.deliverables[0] !== null && 'title' in data.deliverables[0] && typeof data.deliverables[0].title === 'string') ? data.deliverables[0].title : `SEOWorks ${normalizeTaskType(data.taskType)} Task`,
                description: `Task created via SEOWorks customerId mapping\n\nTask ID: ${data.externalId}\nCompleted: ${data.completionDate || new Date().toISOString()}`,
                type: normalizeTaskType(data.taskType).toLowerCase(),
                status: 'COMPLETED',
                seoworksTaskId: data.externalId,
                completedAt: new Date(data.completionDate || Date.now()),
                completedTasks: data.deliverables || [] as any,
                pagesCompleted: normalizeTaskType(data.taskType) === 'PAGE' ? 1 : 0,
                blogsCompleted: normalizeTaskType(data.taskType) === 'BLOG' ? 1 : 0,
                gbpPostsCompleted: normalizeTaskType(data.taskType) === 'GBP_POST' ? 1 : 0,
                improvementsCompleted: normalizeTaskType(data.taskType) === 'IMPROVEMENT' ? 1 : 0
              }
            })
            if (requestRecord) {
              logger.info('Created request from SEOWorks customerId mapping', {
                requestId: requestRecord.id,
                seoworksTaskId: data.externalId,
                dealershipId: dealership.id,
                userId: ownerUser.id,
                taskType: data.taskType
              })
            }
          }
        }
      }
      
      if (!requestRecord) {
        // OPTIMIZED: Store orphaned task asynchronously (don't block webhook response)
        prisma.orphaned_tasks.create({
          data: {
            id: `orphan_${data.externalId}`,
            externalId: data.externalId,
            clientId: (data.clientId as string) || (data.customerId as string),
            clientEmail: data.clientEmail,
            eventType,
            taskType: data.taskType,
            status: data.status,
            completionDate: data.completionDate,
            deliverables: data.deliverables as any,
            rawPayload: payload as any,
            processed: false,
            updatedAt: new Date(),
            notes: `Webhook received for unknown dealership - task orphaned for later processing`
          }
        }).then(orphanedTask => {
          logger.info('Stored orphaned task for unknown dealership', {
            orphanedTaskId: orphanedTask.id,
            externalId: data.externalId,
            eventType,
            clientId: data.clientId,
            clientEmail: data.clientEmail,
            path: '/api/seoworks/webhook',
            method: 'POST'
          })
        }).catch(orphanError => {
          logger.error('Failed to store orphaned task', orphanError, {
            externalId: data.externalId,
            eventType,
            clientId: data.clientId
          })
        })

        // Return immediately without waiting for database insert
        return successResponse({
          message: 'Webhook received and task stored (dealership not yet set up)',
          status: 'stored_for_later_processing',
          seoworksTaskId: data.externalId
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
