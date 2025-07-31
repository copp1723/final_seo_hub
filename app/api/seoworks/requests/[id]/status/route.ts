import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { SimpleAuth } from '@/lib/auth-simple'
import { errorResponse, successResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user.id) {
      return errorResponse('Unauthorized', 401)
    }

    const requestId = params.id

    // Get the request
    const requestRecord = await prisma.requests.findFirst({
      where: { 
        id: requestId,
        userId: session.user.id 
      }
    })

    if (!requestRecord) {
      return errorResponse('Request not found', 404)
    }

    if (!requestRecord.seoworksTaskId) {
      return successResponse({
        status: 'not_submitted',
        message: 'Request not yet submitted to SEOWorks'
      })
    }

    // Check status with SEOWorks API
    const seoworksStatus = await getSeoworksTaskStatus(requestRecord.seoworksTaskId)

    // Update local status if different
    if (seoworksStatus.status !== requestRecord.status) {
      await prisma.requests.update({
        where: { id: requestId },
        data: { status: seoworksStatus.status }
      })
    }

    return successResponse({
      requestId,
      seoworksTaskId: requestRecord.seoworksTaskId,
      status: seoworksStatus.status,
      progress: seoworksStatus.progress,
      estimatedCompletion: seoworksStatus.estimatedCompletion,
      lastUpdated: seoworksStatus.lastUpdated
    })

  } catch (error) {
    logger.error('Failed to get SEOWorks task status', error)
    return errorResponse('Failed to get task status', 500)
  }
}

async function getSeoworksTaskStatus(taskId: string) {
  const seoworksApiKey = process.env.SEOWORKS_API_KEY
  if (!seoworksApiKey) {
    throw new Error('SEOWorks API key not configured')
  }

  const response = await fetch(`${process.env.SEOWORKS_API_URL}/tasks/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${seoworksApiKey}`,
      'X-Client-ID': 'rylie-seo-hub'
    }
  })

  if (!response.ok) {
    throw new Error(`SEOWorks API error: ${response.status}`)
  }

  return await response.json()
}