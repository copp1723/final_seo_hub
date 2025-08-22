import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus, Prisma, UserRole, TaskType, TaskStatus, RequestPriority } from '@prisma/client'
import { validateRequest, createRequestSchema, CreateRequestInput } from '@/lib/validations/index'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { requestCreatedTemplate, welcomeEmailTemplate } from '@/lib/mailgun/templates'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { withApiMonitoring } from '@/lib/api-wrapper'
import crypto from 'crypto'
import { csrfProtection } from '@/lib/csrf'
import { SimpleAuth } from '@/lib/auth-simple'
import { safeDbOperation } from '@/lib/db-resilience'
import { withErrorBoundary, withTimeout } from '@/lib/error-boundaries'

export const dynamic = 'force-dynamic';

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

    // CRITICAL FIX: Add dealership filtering for proper data isolation
    const dealershipIdParam = searchParams.get('dealershipId')
    const dealershipIdsParam = searchParams.get('dealershipIds') // Support multiple dealerships for AGENCY_ADMIN
    
    let dealershipFilter: any = null
    
    if (dealershipIdsParam) {
      // Multiple dealership IDs (comma-separated) for AGENCY_ADMIN users
      const dealershipIds = dealershipIdsParam.split(',').filter(Boolean)
      if (dealershipIds.length > 0) {
        dealershipFilter = { in: dealershipIds }
      }
    } else if (dealershipIdParam && dealershipIdParam !== 'null') {
      // Single dealership ID
      dealershipFilter = dealershipIdParam
    } else if (user.dealershipId) {
      // Fallback to user's default dealership
      dealershipFilter = user.dealershipId
    }

    // If user is AGENCY_ADMIN and has an agencyId, fetch all requests for that agency.
    // Otherwise, fetch requests for the individual user.
    if (user.role === UserRole.AGENCY_ADMIN && user.agencyId) {
      where.agencyId = user.agencyId
      // Apply dealership filter for AGENCY_ADMIN (can be single ID, multiple IDs, or none)
      if (dealershipFilter) {
        where.dealershipId = dealershipFilter
      }
      // For agency admins, if no specific dealership, include both dealership-specific and null dealership requests
    } else if (user.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN sees ALL requests in the system unless filtered by specific dealership
      // This allows them to monitor all activity across all agencies and dealerships
      if (dealershipFilter) {
        where.dealershipId = dealershipFilter
      }
      // No other constraints for SUPER_ADMIN - they see everything
    }
    else {
      where.userId = user.id
      // CRITICAL FIX: For regular users, if they have a dealership, filter by it
      // But if no dealership is specified, show their requests regardless of dealership
      if (dealershipFilter) {
        where.dealershipId = dealershipFilter
      }
      // Don't filter by dealership if none specified - show all user's requests
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

    const requests = await safeDbOperation(() =>
      prisma.requests.findMany({
        where,
        orderBy
      })
    )

    // Fetch completed tasks for all requests
    const requestIds = requests.map(req => req.id)
    const completedTasks = requestIds.length > 0 ? await safeDbOperation(() =>
      prisma.tasks.findMany({
        where: {
          requestId: { in: requestIds },
          status: 'COMPLETED'
        },
        select: {
          id: true,
          title: true,
          type: true,
          targetUrl: true,
          completedAt: true,
          requestId: true
        }
      })
    ) : []

    // Fetch dealership names for requests that have dealershipId
    const dealershipIds = [...new Set(requests.map(req => req.dealershipId).filter(Boolean))]
    const dealerships = dealershipIds.length > 0 ? await safeDbOperation(() =>
      prisma.dealerships.findMany({
        where: { id: { in: dealershipIds as string[] } },
        select: { id: true, name: true, clientId: true }
      })
    ) : []

    // Create lookup map for dealerships
    const dealershipMap = dealerships.reduce((acc, dealership) => {
      acc[dealership.id] = dealership
      return acc
    }, {} as Record<string, any>)

    // Group completed tasks by requestId
    const tasksByRequest = completedTasks.reduce((acc, task) => {
      if (!acc[task.requestId!]) acc[task.requestId!] = []
      acc[task.requestId!].push({
        id: task.id,
        title: task.title,
        type: task.type.toLowerCase(),
        url: task.targetUrl,
        completedAt: task.completedAt
      })
      return acc
    }, {} as Record<string, any[]>)

    // Merge completed tasks and dealership info into requests
    const requestsWithTasks = requests.map(request => ({
      ...request,
      completedTasks: tasksByRequest[request.id] || [],
      dealership: request.dealershipId ? dealershipMap[request.dealershipId] : null
    }))

    logger.info('Requests fetched successfully', {
      userId: authResult.user.id,
      dealershipFilter: dealershipFilter,
      dealershipIdParam: dealershipIdParam,
      dealershipIdsParam: dealershipIdsParam,
      count: requestsWithTasks.length,
      completedTasksCount: completedTasks.length,
      filters: { status: statusParam, type, searchQuery, sortBy, sortOrder },
      path: '/api/requests',
      method: 'GET'
    })
    
    return successResponse({ requests: requestsWithTasks })
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

  // CSRF protection for session-authenticated requests
  const session = await SimpleAuth.getSessionFromRequest(request)
  const csrfResult = await csrfProtection(request, () => session?.user.id || null)
  if (csrfResult) {
    return csrfResult
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

  // Read raw body without logging contents in production
  const rawBody = await request.text()
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Focus request raw body received (dev)', {
      userId: authResult.user.id,
      bodyLength: rawBody.length
    })
  }

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
      errorDetails: errorDetails
    })
    return validation.error
  }
  
  const { data } = validation
  const typedData = data as CreateRequestInput
  logger.info('Focus request validation successful', {
    userId: authResult.user.id,
    requestData: {
      title: typedData.title,
      type: typedData.type,
      priority: typedData.priority,
      packageType: typedData.packageType,
      keywordsCount: typedData.keywords?.length || 0,
      targetCitiesCount: typedData.targetCities?.length || 0,
      targetModelsCount: typedData.targetModels?.length || 0
    }
  })
  
  try {
    // CRITICAL FIX: Fetch user with dealershipId before creating request
    const user = await safeDbOperation(() =>
      prisma.users.findUnique({
        where: { id: authResult.user.id },
        select: { 
          id: true,
          dealershipId: true, 
          agencyId: true,
          email: true 
        }
      })
    )

    if (!user) {
      logger.error('User not found when creating request', {
        userId: authResult.user.id
      })
      return errorResponse('User not found', 404)
    }

    logger.info('Creating focus request in database', {
      userId: authResult.user.id,
      userDealershipId: user.dealershipId,
      requestData: {
        title: typedData.title,
        description: typedData.description,
        type: typedData.type,
        priority: typedData.priority,
        packageType: typedData.packageType,
        targetUrl: typedData.targetUrl,
        keywords: typedData.keywords,
        targetCities: typedData.targetCities,
        targetModels: typedData.targetModels,
        agencyId: user.agencyId,
        dealershipId: user.dealershipId,
        hasDealership: !!user.dealershipId
      }
    })

    const newRequest = await safeDbOperation(() =>
      prisma.requests.create({
        data: {
          id: crypto.randomUUID(),
          userId: authResult.user.id,
          agencyId: user.agencyId || authResult.user.agencyId || null,
          dealershipId: user.dealershipId || null, // CRITICAL FIX: Now including dealershipId
          title: typedData.title,
          description: typedData.description,
          type: typedData.type,
          priority: typedData.priority,
          status: RequestStatus.PENDING,
          packageType: typedData.packageType || null,
          keywords: typedData.keywords || [],
          targetUrl: typedData.targetUrl || null,
          targetCities: typedData.targetCities || [],
          targetModels: typedData.targetModels || [],
          updatedAt: new Date()
        },
        include: {
          users: true,
          agencies: true
        }
      })
    )

    logger.info('Focus request created successfully in database', {
      userId: authResult.user.id,
      requestId: newRequest.id,
      title: newRequest.title,
      type: newRequest.type,
      dealershipId: user.dealershipId,
      requestDealershipId: (newRequest as any).dealershipId
    })
    
    // Create associated tasks
    try {
      const tasksToCreate: Array<{
        id: string;
        userId: string;
        dealershipId: string | null;
        agencyId: string | null;
        type: TaskType;
        title: string;
        description: string;
        priority: RequestPriority;
        targetUrl: string | null;
        keywords?: Prisma.InputJsonValue;
        requestId: string;
        status: TaskStatus;
        updatedAt: Date;
      }> = [];
      // Create a single task based on the request type
      // CRITICAL FIX: Use dealershipId from user, not from newRequest
      const taskData: any = {
        id: crypto.randomUUID(),
        userId: newRequest.userId,
        dealershipId: user.dealershipId || null, // FIX: Use dealershipId from user object
        agencyId: newRequest.agencyId || null,
        type: newRequest.type.toUpperCase() as TaskType, // Convert lowercase request type to uppercase TaskType enum
        title: newRequest.title,
        description: newRequest.description || '',
        priority: newRequest.priority as RequestPriority,
        targetUrl: newRequest.targetUrl || null,
        requestId: newRequest.id, // Link to the newly created request
        status: TaskStatus.PENDING, // Default status for new tasks
        updatedAt: new Date()
      }
      
      // Only add keywords if they exist and are not empty
      if (Array.isArray(newRequest.keywords) && newRequest.keywords.length > 0) {
        taskData.keywords = newRequest.keywords as Prisma.InputJsonValue
      }
      
      tasksToCreate.push(taskData);

      // You can add more complex logic here to create multiple tasks
      // For example, if request.type is 'SEO_AUDIT', create multiple sub-tasks (e.g., 'TECHNICAL_AUDIT_TASK', 'CONTENT_AUDIT_TASK')

      if (tasksToCreate.length > 0) {
        await safeDbOperation(() =>
          prisma.tasks.createMany({
            data: tasksToCreate
          })
        );
        logger.info(`${tasksToCreate.length} tasks created for request`, {
          requestId: newRequest.id,
          taskTypes: tasksToCreate.map(t => t.type),
          dealershipId: user.dealershipId,
          taskDealershipIds: tasksToCreate.map(t => t.dealershipId)
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
    const requestCount = await safeDbOperation(() =>
      prisma.requests.count({
        where: { userId: authResult.user.id },
      })
    )
    
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
      type: typedData.type,
      priority: typedData.priority,
      path: '/api/requests',
      method: 'POST',
      responseStructure: {
        hasRequest: !!newRequest,
        requestId: newRequest.id,
        requestKeys: Object.keys(newRequest)
      }
    })
    
    // Trigger SEOworks focus request send after local request creation
    // Skip in test to keep unit tests deterministic
    if (process.env.NODE_ENV !== 'test') {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL
        if (baseUrl) {
          await fetch(`${baseUrl}/api/seoworks/send-focus-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: newRequest.id })
          })
        } else {
          logger.warn('SEOWorks send-focus-request not triggered: base URL not set', {
            envVarsPresent: !!process.env.NEXTAUTH_URL || !!process.env.NEXT_PUBLIC_APP_URL
          })
        }
      } catch (triggerError) {
        logger.error('Failed to trigger SEOWorks focus send', triggerError, {
          requestId: newRequest.id
        })
      }
    }

    const response = successResponse({ request: newRequest }, 201)
    
    // Log what we're actually returning to help debug client-side parsing
    logger.info('Focus request API response structure', {
      requestId: newRequest.id,
      responseBodyPreview: JSON.stringify({ request: newRequest }).substring(0, 200),
      successResponseFormat: 'direct data (no wrapper)',
      expectedClientPath: 'response.request.id'
    })
    
    return response
  } catch (error) {
    logger.error('Error creating request', error, {
      userId: authResult.user.id,
      requestData: {
        title: typedData.title,
        type: typedData.type,
        priority: typedData.priority
      },
      path: '/api/requests',
      method: 'POST'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}

export const GET = withApiMonitoring(handleGET)
export const POST = withApiMonitoring(handlePOST)
