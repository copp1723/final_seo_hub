import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { SimpleAuth } from '@/lib/auth-simple'
import { errorResponse, successResponse } from '@/lib/api-auth'

// Submit new request to SEOWorks
export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user.id) {
      return errorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { requestId, taskType, priority = 'medium' } = body

    // Get the request details
    const requestRecord = await prisma.requests.findFirst({
      where: { 
        id: requestId,
        userId: session.user.id 
      },
      include: { users: true }
    })

    if (!requestRecord) {
      return errorResponse('Request not found', 404)
    }

    // Submit to SEOWorks API
    const seoworksResponse = await submitToSeoworks({
      externalId: requestRecord.id,
      clientId: requestRecord.userId,
      clientEmail: requestRecord.users.email,
      taskType,
      title: requestRecord.title,
      description: requestRecord.description,
      targetUrl: requestRecord.targetUrl,
      keywords: requestRecord.keywords,
      priority
    })

    // Update request with SEOWorks task ID
    await prisma.requests.update({
      where: { id: requestId },
      data: { 
        seoworksTaskId: seoworksResponse.taskId,
        status: 'IN_PROGRESS'
      }
    })

    logger.info('Request submitted to SEOWorks', {
      requestId,
      seoworksTaskId: seoworksResponse.taskId,
      userId: session.user.id
    })

    return successResponse({
      success: true,
      seoworksTaskId: seoworksResponse.taskId,
      status: 'submitted'
    })

  } catch (error) {
    logger.error('SEOWorks request submission failed', error)
    return errorResponse('Failed to submit request', 500)
  }
}

async function submitToSeoworks(data: any) {
  const seoworksApiKey = process.env.SEOWORKS_API_KEY
  if (!seoworksApiKey) {
    throw new Error('SEOWorks API key not configured')
  }

  const response = await fetch(`${process.env.SEOWORKS_API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${seoworksApiKey}`,
      'X-Client-ID': 'rylie-seo-hub'
    },
    body: JSON.stringify({
      external_id: data.externalId,
      client_id: data.clientId,
      client_email: data.clientEmail,
      task_type: data.taskType,
      title: data.title,
      description: data.description,
      target_url: data.targetUrl,
      keywords: data.keywords,
      priority: data.priority,
      webhook_url: `${process.env.NEXTAUTH_URL}/api/seoworks/webhook`
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SEOWorks API error: ${response.status} - ${error}`)
  }

  return await response.json()
}