import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus, Prisma, UserRole, TaskType, TaskStatus } from '@prisma/client'
import { validateRequest, createRequestSchema } from '@/lib/validations/index'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { requestCreatedTemplate, welcomeEmailTemplate } from '@/lib/mailgun/templates'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { withApiMonitoring } from '@/lib/api-wrapper'

async function handleGET(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  const user = authResult.user
  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const type = searchParams.get('type')
  const searchQuery = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrderParam = searchParams.get('sortOrder') || 'desc'
  const sortOrder = (sortOrderParam === 'asc' || sortOrderParam === 'desc') ? sortOrderParam : 'desc'

  try {
    const where: Prisma.requestsWhereInput = {}

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
      // If they *are* also an AGENCY_ADMIN (e.g agencyId is set on their user), the AGENCY_ADMIN rule above applies.
      // If they are a SUPER_ADMIN and no agencyId, they see their own requests.
      // This behavior can be changed if SUPER_ADMINs should see *all* requests through this endpoint.
      where.userId = user.id; // Default to user's own requests, can be overridden by specific admin views
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
        { targetModels: { array_contains: [searchQuery] } }
      ]
    }

    const orderBy: Prisma.requestsOrderByWithRelationInput = {}
    if (sortBy === 'createdAt' || sortBy === 'priority' || sortBy === 'status') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.createdAt = 'desc' // Default sort
    }

    const requests = await prisma.requests.findMany({
      where,
      orderBy
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

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  logger.info('Focus request creation started', {
    path: '/api/requests',
    method: 'POST'
  })

  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) {
    logger.warn('Focus request rate limited', {
      path: '/api/requests'
    })
    return rateLimitResponse
  }
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    logger.warn('Focus request unauthorized', {
      authenticated: authResult.authenticated,
      hasUser: !!authResult.user
    })
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  logger.info('Focus request auth successful', {
    userId: authResult.user.id,
    userRole: authResult.user.role,
    agencyId: authResult.user.agencyId
  })

  // Log the raw request body for debugging
  const rawBody = await request.text()
  logger.info('Focus request raw body received', {
    userId: authResult.user.id,
    bodyLength: rawBody.length,
    rawBody: rawBody
  })

  // Re-create the request with the body for validation
  const requestWithBody = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody
  })
  
  // Validate request body
  const validation = await validateRequest(requestWithBody, createRequestSchema)
  if (!validation.success) {
    // Get detailed error message from the response
    let errorDetails = 'Unknown validation error'
    try {
      if (validation.error instanceof Response) {
        const errorText = await validation.error.text()
        errorDetails = errorText
      }
    } catch (e) {
      errorDetails = 'Could not parse validation error'
    }
    
    logger.error('Focus request validation failed', {
      userId: authResult.user.id,
      validationError: validation.error,
      rawBody: rawBody,
      errorDetails: errorDetails,
      bodyParsed: JSON.parse(rawBody),
      requestHeaders: Object.fromEntries(request.headers.entries())
    })
    return validation.error
  }
  
  const { data } = validation
  logger.info('Focus request validation successful', {
    userId: authResult.user.id,
    requestData: {
      title: data.title,
      type: data.type,
      priority: data.priority,
      packageType: data.packageType,
      keywordsCount: data.keywords?.length || 0,
      targetCitiesCount: data.targetCities?.length || 0,
      targetModelsCount: data.targetModels?.length || 0
    }
  })
  
  try {
    logger.info('Creating focus request in database', {
      userId: authResult.user.id,
      requestData: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        packageType: data.packageType,
        targetUrl: data.targetUrl,
        keywords: data.keywords,
        targetCities: data.targetCities,
        targetModels: data.targetModels,
        agencyId: authResult.user.agencyId
      }
    })

    const newRequest = await prisma.requests.create({
      data: {
        userId: authResult.user.id,
        agencyId: authResult.user.agencyId || null, // Handle null agencyId
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        status: RequestStatus.PENDING,
        packageType: data.packageType || null,
        keywords: data.keywords || [],
        targetUrl: data.targetUrl || null,
        targetCities: data.targetCities || [],
        targetModels: data.targetModels || []
      },
      include: {
        users: true,
        agencies: true
      }
    })

    logger.info('Focus request created successfully in database', {
      userId: authResult.user.id,
      requestId: newRequest.id,
      title: newRequest.title,
      type: newRequest.type
    })
    
    // Create associated tasks
    try {
      const tasksToCreate = [];
      // Example: Create a single task based on the request type
      tasksToCreate.push({
        userId: newRequest.userId,
        // Using dealershipId from newRequest if available; otherwise null.
        // It's crucial that newRequest.dealershipId is populated or null.
        dealershipId: (newRequest as any).dealershipId || null,
        agencyId: newRequest.agencyId || null,
        type: newRequest.type.toUpperCase() as TaskType, // Convert lowercase request type to uppercase TaskType enum
        title: newRequest.title,
        description: newRequest.description || '',
        priority: newRequest.priority,
        targetUrl: newRequest.targetUrl || null,
        // Explicitly handle Prisma.JsonNull for empty arrays in JSON fields
        keywords: Array.isArray(newRequest.keywords) && newRequest.keywords.length > 0 ? (newRequest.keywords as Prisma.InputJsonValue) : Prisma.JsonNull,
        requestId: newRequest.id, // Link to the newly created request
        status: TaskStatus.PENDING, // Default status for new tasks
        targetCities: Array.isArray(newRequest.targetCities) && newRequest.targetCities.length > 0 ? (newRequest.targetCities as Prisma.InputJsonValue) : Prisma.JsonNull,
        targetModels: Array.isArray(newRequest.targetModels) && newRequest.targetModels.length > 0 ? (newRequest.targetModels as Prisma.InputJsonValue) : Prisma.JsonNull,
      });

      // You can add more complex logic here to create multiple tasks
      // For example, if request.type is 'SEO_AUDIT', create multiple sub-tasks (e.g., 'TECHNICAL_AUDIT_TASK', 'CONTENT_AUDIT_TASK')

      if (tasksToCreate.length > 0) {
        await prisma.tasks.createMany({
          data: tasksToCreate
        });
        logger.info(`${tasksToCreate.length} tasks created for request`, {
          requestId: newRequest.id,
          taskTypes: tasksToCreate.map(t => t.type)
        });
      }
    } catch (taskCreationError) {
      logger.error('Error creating tasks for request', taskCreationError, {
        requestId: newRequest.id,
        requestType: newRequest.type
      });
      // Do not block initial request creation if task creation fails
    }
    
    // Send request created email notification
    const emailTemplate = requestCreatedTemplate(newRequest, newRequest.users)
    await queueEmailWithPreferences(
      newRequest.userId,
      'requestCreated',
      { ...emailTemplate,
        to: newRequest.users.email
      },
    )
    
    // Check if this is the user's first request and send welcome email
    const requestCount = await prisma.requests.count({
      where: { userId: authResult.user.id },
    })
    
    if (requestCount === 1) {
      const welcomeTemplate = welcomeEmailTemplate(newRequest.users)
      await queueEmailWithPreferences(
        newRequest.userId,
        'requestCreated', // Use requestCreated preference for welcome email
        { ...welcomeTemplate,
          to: newRequest.users.email
      },
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

export const GET = withApiMonitoring(handleGET)
export const POST = withApiMonitoring(handlePOST)
