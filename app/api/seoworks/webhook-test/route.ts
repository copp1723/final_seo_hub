import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { RequestStatus, RequestPriority, PackageType } from '@prisma/client'

// This is a TEST endpoint that auto-creates requests if they don't exist
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { eventType, data } = payload

    // Find or create a test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@jayhatfield.com' }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@jayhatfield.com',
          name: 'Jay Hatfield Test',
          role: 'USER',
          onboardingCompleted: true,
          activePackageType: PackageType.GOLD,
        }
      })
    }

    // Check if request exists
    let requestRecord = await prisma.request.findFirst({
      where: { id: data.externalId }
    })

    // If not, create it
    if (!requestRecord) {
      const taskType = data.taskType.toLowerCase()
      const typeMap: Record<string, string> = {
        'page': 'page',
        'blog': 'blog',
        'gbp_post': 'gbp_post',
        'g': 'gbp_post', // Handle task-g- prefix
        'p': 'page',     // Handle task-p- prefix
        'b': 'blog'      // Handle task-b- prefix
      }

      // Extract type from task ID if needed
      let type = typeMap[taskType] || 'page'
      if (data.externalId.startsWith('task-')) {
        const prefix = data.externalId.split('-')[1]
        type = typeMap[prefix] || type
      }

      requestRecord = await prisma.request.create({
        data: {
          id: data.externalId,
          userId: testUser.id,
          title: `Auto-created: ${data.deliverables?.[0]?.title || data.taskType}`,
          description: data.notes || 'Auto-created request for webhook testing',
          type,
          status: RequestStatus.IN_PROGRESS,
          priority: RequestPriority.MEDIUM,
          packageType: PackageType.GOLD,
        },
        include: { user: true }
      })

      logger.info('Auto-created request for testing', {
        requestId: requestRecord.id,
        type
      })
    }

    // Mark as completed
    if (eventType === 'task.completed') {
      const completedTask = {
        title: data.deliverables?.[0]?.title || data.taskType,
        type: data.taskType,
        url: data.deliverables?.[0]?.url,
        completedAt: data.completionDate || new Date().toISOString()
      }

      await prisma.request.update({
        where: { id: requestRecord.id },
        data: {
          status: RequestStatus.COMPLETED,
          completedAt: new Date(),
          completedTasks: [completedTask]
        }
      })

      logger.info('Test webhook processed - task completed', {
        requestId: requestRecord.id,
        taskType: data.taskType
      })
    }

    return successResponse({
      message: 'Test webhook processed successfully',
      eventType,
      requestId: requestRecord.id,
      created: !requestRecord
    })

  } catch (error) {
    logger.error('Test webhook error', error)
    return errorResponse('Test webhook processing failed', 500)
  }
} 