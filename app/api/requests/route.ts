import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus } from '@prisma/client'
import { validateRequest, createRequestSchema } from '@/lib/validations/index'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  try {
    const requests = await prisma.request.findMany({
      where: { userId: authResult.user.id },
      orderBy: { createdAt: 'desc' },
    })
    
    logger.info('Requests fetched successfully', {
      userId: authResult.user.id,
      count: requests.length,
      path: '/api/requests',
      method: 'GET'
    })
    
    return successResponse({ requests })
  } catch (error) {
    logger.error('Error fetching requests', error, {
      userId: authResult.user.id,
      path: '/api/requests',
      method: 'GET'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response
  
  // Validate request body
  const validation = await validateRequest(request, createRequestSchema)
  if (!validation.success) return validation.error
  
  const { data } = validation
  
  try {
    const newRequest = await prisma.request.create({
      data: {
        userId: authResult.user.id,
        agencyId: authResult.user.agencyId,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        status: RequestStatus.PENDING,
        packageType: data.packageType || null,
        keywords: data.keywords || [],
        targetUrl: data.targetUrl || null,
        targetCities: data.targetCities || [],
        targetModels: data.targetModels || [],
      },
    })
    
    logger.info('Request created successfully', {
      userId: authResult.user.id,
      requestId: newRequest.id,
      type: data.type,
      priority: data.priority,
      path: '/api/requests',
      method: 'POST'
    })
    
    return successResponse({ request: newRequest }, 'Request created successfully')
  } catch (error) {
    logger.error('Error creating request', error, {
      userId: authResult.user.id,
      requestData: {
        title: data.title,
        type: data.type,
        priority: data.priority
      },
      path: '/api/requests',
      method: 'POST'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}