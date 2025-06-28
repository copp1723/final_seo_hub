import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestPriority, RequestStatus } from '@prisma/client'

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
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.description || !body.type) {
      return errorResponse('Missing required fields')
    }
    
    const newRequest = await prisma.request.create({
      data: {
        userId: authResult.user.id,
        agencyId: authResult.user.agencyId,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority || RequestPriority.MEDIUM,
        status: RequestStatus.PENDING,
        packageType: body.packageType || null,
        keywords: body.keywords || [],
        targetUrl: body.targetUrl,
      },
    })
    
    return successResponse({ request: newRequest }, 'Request created successfully')
  } catch (error) {
    console.error('Error creating request:', error)
    return errorResponse('Failed to create request', 500)
  }
}