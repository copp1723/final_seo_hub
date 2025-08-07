import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { withApiMonitoring } from '@/lib/api-wrapper'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

async function handlePOST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }
  if (authResult.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Forbidden', 403)
  }

  const body = await request.json().catch(() => ({}))
  const { userId, userEmail } = body || {}
  if (!userId && !userEmail) {
    return errorResponse('userId or userEmail is required', 400)
  }

  try {
    const orphanedTasks = await prisma.orphaned_tasks.findMany({
      where: {
        OR: [
          userId ? { clientId: userId } : {},
          userEmail ? { clientEmail: userEmail } : {}
        ].filter((c) => Object.keys(c).length > 0),
        processed: false,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (orphanedTasks.length === 0) {
      return successResponse({ processed: 0, created: 0, message: 'No orphaned tasks to process' })
    }

    let processedCount = 0
    let createdCount = 0

    for (const orphaned of orphanedTasks) {
      try {
        if (orphaned.eventType === 'task.completed') {
          const newRequest = await prisma.requests.create({
            data: {
              userId: userId!,
              title: Array.isArray(orphaned.deliverables) && (orphaned.deliverables as any[])[0]?.title
                ? (orphaned.deliverables as any[])[0].title
                : `SEOWorks ${String(orphaned.taskType).toLowerCase()} Task`,
              description: `Task created from orphaned SEOWorks task\n\nOriginal Task ID: ${orphaned.externalId}\nCompleted: ${orphaned.completionDate || new Date().toISOString()}\n\nOriginal Notes: ${orphaned.notes || ''}`,
              type: String(orphaned.taskType).toLowerCase(),
              status: 'COMPLETED',
              seoworksTaskId: orphaned.externalId,
              completedAt: orphaned.completionDate ? new Date(orphaned.completionDate) : new Date(),
              completedTasks: (orphaned.deliverables as any) || [],
              pagesCompleted: String(orphaned.taskType).toLowerCase() === 'page' ? 1 : 0,
              blogsCompleted: String(orphaned.taskType).toLowerCase() === 'blog' ? 1 : 0,
              gbpPostsCompleted: String(orphaned.taskType).toLowerCase() === 'gbp_post' ? 1 : 0,
              improvementsCompleted: ['improvement', 'maintenance', 'seochange'].includes(String(orphaned.taskType).toLowerCase()) ? 1 : 0,
            },
          })

          await prisma.orphaned_tasks.update({
            where: { id: orphaned.id },
            data: {
              processed: true,
              linkedRequestId: newRequest.id,
              notes: `${orphaned.notes || ''}\n\nProcessed and linked to request ${newRequest.id} for user ${userId}`,
            },
          })

          createdCount++
        } else {
          await prisma.orphaned_tasks.update({
            where: { id: orphaned.id },
            data: {
              processed: true,
              notes: `${orphaned.notes || ''}\n\nProcessed manually for user ${userId} - event type ${orphaned.eventType}`,
            },
          })
        }
        processedCount++
      } catch (e) {
        logger.error('Failed processing orphaned task', e, { orphanedId: orphaned.id })
      }
    }

    return successResponse({ processed: processedCount, created: createdCount })
  } catch (e) {
    return errorResponse('Internal error', 500)
  }
}

export const POST = withApiMonitoring(handlePOST)

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

export const dynamic = 'force-dynamic'

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
              improvementsCompleted: ['improvement', 'maintenance', 'seochange'].includes(orphanedTask.taskType.toLowerCase()) ? 1 : 0
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

export const POST = compose(
  withRateLimit(10, 60000), // 10 requests per minute
  requireApiKey('SEOWORKS_WEBHOOK_SECRET')
)(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userId, userEmail, clientId } = body

    if (!userId && !userEmail && !clientId) {
      return badRequestResponse('Either userId, userEmail, or clientId must be provided')
    }

    // Verify the user exists
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          userId ? { id: userId } : {},
          userEmail ? { email: userEmail } : {},
          clientId ? { id: clientId } : {}
        ].filter(condition => Object.keys(condition).length > 0)
      }
    })

    if (!user) {
      return badRequestResponse('User not found')
    }

    // Process orphaned tasks for this user
    const result = await processOrphanedTasksForUser(user.id, user.email)

    logger.info('Successfully processed orphaned tasks via API', {
      userId: user.id,
      userEmail: user.email,
      result
    })

    return successResponse({
      message: 'Orphaned tasks processed successfully',
      userId: user.id,
      userEmail: user.email,
      orphanedTasksProcessed: result.processed,
      requestsCreated: result.created
    })
  } catch (error) {
    logger.error('Error processing orphaned tasks via API', error)
    return internalErrorResponse(getSafeErrorMessage(error))
  }
})

export const GET = compose(
  withRateLimit(20, 60000), // 20 requests per minute
  requireApiKey('SEOWORKS_WEBHOOK_SECRET')
)(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const processed = searchParams.get('processed')
    const clientId = searchParams.get('clientId')
    const clientEmail = searchParams.get('clientEmail')

    let where: any = {}

    if (processed !== null) {
      where.processed = processed === 'true'
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (clientEmail) {
      where.clientEmail = clientEmail
    }

    const orphanedTasks = await prisma.orphaned_tasks.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to avoid large responses
    })

    const summary = await prisma.orphaned_tasks.groupBy({
      by: ['processed', 'eventType', 'taskType'],
      _count: {
        id: true
      },
      where
    })

    return successResponse({
      orphanedTasks,
      summary,
      total: orphanedTasks.length
    })
  } catch (error) {
    logger.error('Error fetching orphaned tasks', error)
    return internalErrorResponse(getSafeErrorMessage(error))
  }
})