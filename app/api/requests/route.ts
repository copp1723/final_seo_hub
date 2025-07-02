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

    // If user is AGENCY_ADMIN and has an agencyId, fetch all requests for that agency.
    // Otherwise, fetch requests for the individual user.
    if (user.role === UserRole.AGENCY_ADMIN && user.agencyId) {
      where.agencyId = user.agencyId
    } else if (user.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN can see all requests if no specific agencyId is provided via a different route
      // For this route, we assume they want to see their own requests or all if not filtered by agency
      // To see all agency requests, they would use a dedicated admin route.
      // If they have an agencyId, it implies they might be acting as an admin for that agency.
      // However, the current logic is simple: SUPER_ADMIN sees all if not constrained.
      // For this specific route /api/requests, let's keep it to their own requests *unless* an agency filter is added later.
      // For now, this means they see requests associated with their user ID, or all if no user ID constraint is applied.
      // This part might need refinement based on exact SUPER_ADMIN viewing requirements on this generic endpoint.
      // The most straightforward interpretation for /api/requests is "my requests" or "my agency's requests".
      // For "all requests in the system", a dedicated /api/admin/requests endpoint would be more appropriate.
      // Thus, if a SUPER_ADMIN is not specifically an AGENCY_ADMIN for an agency, they see their own.
      // If they *are* also an AGENCY_ADMIN (e.g. agencyId is set on their user), the AGENCY_ADMIN rule above applies.
      // If they are a SUPER_ADMIN and no agencyId, they see their own requests.
      // This behavior can be changed if SUPER_ADMINs should see *all* requests through this endpoint.
      where.userId = user.id; // Default to user's own requests, can be overridden by specific admin views.
    }
    else {
      where.userId = user.id
    }

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
    })

    logger.info('Requests fetched successfully', {
      userId: authResult.user.id,
      count: requests.length,
      filters: { status: statusParam, type, searchQuery, sortBy, sortOrder },
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
        user: true
      }
    })
    
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