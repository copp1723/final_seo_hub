import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus } from '@prisma/client'
import { validateRequest, createRequestSchema } from '@/lib/validations/index'

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
    
    return successResponse({ requests })
  } catch (error) {
    console.error('Error fetching requests:', error)
    return errorResponse('Failed to fetch requests', 500)
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
    
    return successResponse({ request: newRequest }, 'Request created successfully')
  } catch (error) {
    console.error('Error creating request:', error)
    return errorResponse('Failed to create request', 500)
  }
}