import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { withApiMonitoring } from '@/lib/api-wrapper'
import { logger } from '@/lib/logger'
import { TaskType as DbTaskType, TaskStatus as DbTaskStatus, RequestPriority } from '@prisma/client'

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
  const { userId, userEmail, externalId } = body || {}
  if (!userId && !userEmail && !externalId) {
    return errorResponse('Provide userId or userEmail, or externalId', 400)
  }

  try {
    // If externalId is provided, limit to that single orphaned task
    const orphanedTasks = externalId
      ? await prisma.orphaned_tasks.findMany({ where: { externalId, processed: false } })
      : await prisma.orphaned_tasks.findMany({
          where: {
            OR: [
              userId ? { clientId: userId } : {},
              userEmail ? { clientEmail: userEmail } : {},
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
          // Determine the owning user
          let ownerUserId = userId
          let ownerDetails: { id: string; dealershipId: string | null; agencyId: string | null } | null = null
          if (!ownerUserId) {
            const owner = await prisma.users.findFirst({
              where: {
                OR: [
                  orphaned.clientId ? { id: orphaned.clientId } : {},
                  orphaned.clientEmail ? { email: orphaned.clientEmail } : {},
                ].filter((c) => Object.keys(c).length > 0),
              },
              select: { id: true, dealershipId: true, agencyId: true },
            })
            ownerUserId = owner?.id
            if (owner) ownerDetails = { id: owner.id, dealershipId: owner.dealershipId || null, agencyId: owner.agencyId || null }
          }

          if (!ownerUserId) {
            // Skip if we cannot resolve a user
            await prisma.orphaned_tasks.update({
              where: { id: orphaned.id },
              data: { notes: `${orphaned.notes || ''}\n\nProcessing skipped: no user resolved` },
            })
            continue
          }

          // Ensure we have owner details
          if (!ownerDetails) {
            const fetched = await prisma.users.findUnique({
              where: { id: ownerUserId! },
              select: { id: true, dealershipId: true, agencyId: true }
            })
            if (fetched) ownerDetails = { id: fetched.id, dealershipId: fetched.dealershipId || null, agencyId: fetched.agencyId || null }
          }

          const newRequest = await prisma.requests.create({
            data: {
              userId: ownerUserId!,
              dealershipId: ownerDetails?.dealershipId || null,
              agencyId: ownerDetails?.agencyId || null,
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

          // Also create or update a Task entry so the Tasks page reflects it
          const mapType = (t: string): DbTaskType | null => {
            const v = String(t).toLowerCase()
            if (v === 'page') return DbTaskType.PAGE
            if (v === 'blog') return DbTaskType.BLOG
            if (v === 'gbp_post') return DbTaskType.GBP_POST
            if (['improvement', 'maintenance', 'seochange'].includes(v)) return DbTaskType.IMPROVEMENT
            return null
          }
          const dbType = mapType(String(orphaned.taskType))
          if (dbType) {
            const first = Array.isArray(orphaned.deliverables) && (orphaned.deliverables as any[])[0] || null
            const title = first?.title || `SEOWorks ${String(orphaned.taskType).toLowerCase()} Task`
            const targetUrl = first?.url || null
            await prisma.tasks.create({
              data: {
                userId: newRequest.userId,
                dealershipId: ownerDetails?.dealershipId || null,
                agencyId: ownerDetails?.agencyId || null,
                type: dbType,
                status: DbTaskStatus.COMPLETED,
                title,
                description: `Auto-created from orphaned SEOWorks task ${orphaned.externalId}`,
                priority: RequestPriority.MEDIUM,
                targetUrl,
                requestId: newRequest.id,
                completedAt: newRequest.completedAt || new Date(),
              }
            })
          }

          await prisma.orphaned_tasks.update({
            where: { id: orphaned.id },
            data: {
              processed: true,
              linkedRequestId: newRequest.id,
              notes: `${orphaned.notes || ''}\n\nProcessed and linked to request ${newRequest.id} for user ${newRequest.userId}`,
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