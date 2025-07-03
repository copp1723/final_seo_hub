import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus, Prisma, UserRole } from '@prisma/client'
import { validateRequest, createRequestSchema } from '@/lib/validations/index'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { requestCreatedTemplate, welcomeEmailTemplate } from '@/lib/mailgun/templates'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const user = authResult.user
  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const type = searchParams.get('type')
  const searchQuery = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrderParam = searchParams.get('sortOrder') || 'desc'
  const sortOrder = (sortOrderParam === 'asc' || sortOrderParam === 'desc') ? sortOrderParam : 'desc'

  try {
    let where: Prisma.RequestWhereInput = {}

    // Determine access level based on user role
    if (user.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN sees all requests if no filters applied
      // If they want to see only their own, they should use a different endpoint
      // For now, we'll show all requests they have access to
      where = {} // No filtering, see all requests
    } else if (user.role === UserRole.AGENCY_ADMIN && user.agencyId) {
      // AGENCY_ADMIN sees all requests in their agency
      where.agencyId = user.agencyId
    } else if (user.role === UserRole.ADMIN && user.agencyId) {
      // ADMIN with agency sees all requests in their agency
      where.agencyId = user.agencyId
    } else {
      // Regular users only see their own requests
      where.userId = user.id
    }

    // Apply additional filters
    if (statusParam && statusParam !== 'all') {
      where.status = statusParam as RequestStatus
    }

    if (type && type !== 'all') {
      where.type = type
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { targetCities: { array_contains: [searchQuery] } },
        { targetModels: { array_contains: [searchQuery] } },
      ]
    }

    const orderBy: Prisma.RequestOrderByWithRelationInput = {}
    if (sortBy === 'createdAt' || sortBy === 'priority' || sortBy === 'status') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.createdAt = 'desc' // Default sort
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    logger.info('Requests fetched successfully', {
      userId: authResult.user.id,
      count: requests.length,
      filters: { status: statusParam, type, searchQuery, sortBy, sortOrder },
      accessLevel: user.role,
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
      include: {
        user: true,
        agency: true
      }
    })
    
    // Send focus request to SEOWorks
    try {
      const seoworksResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/seoworks/send-focus-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: newRequest.id })
      })
      
      if (!seoworksResponse.ok) {
        logger.warn('Failed to send request to SEOWorks', {
          requestId: newRequest.id,
          status: seoworksResponse.status,
          statusText: seoworksResponse.statusText
        })
      } else {
        logger.info('Request sent to SEOWorks successfully', {
          requestId: newRequest.id
        })
      }
    } catch (seoworksError) {
      logger.error('Error sending request to SEOWorks', seoworksError, {
        requestId: newRequest.id
      })
      // Don't fail the request creation if SEOWorks integration fails
    }
    
    // Send request created email notification
    const emailTemplate = requestCreatedTemplate(newRequest, newRequest.user)
    await queueEmailWithPreferences(
      newRequest.userId,
      'requestCreated',
      {
        ...emailTemplate,
        to: newRequest.user.email
      }
    )
    
    // Check if this is the user's first request and send welcome email
    const requestCount = await prisma.request.count({
      where: { userId: authResult.user.id }
    })
    
    if (requestCount === 1) {
      const welcomeTemplate = welcomeEmailTemplate(newRequest.user)
      await queueEmailWithPreferences(
        newRequest.userId,
        'requestCreated', // Use requestCreated preference for welcome email
        {
          ...welcomeTemplate,
          to: newRequest.user.email
        }
      )
    }
    
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