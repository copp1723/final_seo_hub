import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { RequestStatus, Prisma, Request as RequestType } from '@prisma/client' // Renamed Request to RequestType
import { validateRequest, createRequestSchema } from '@/lib/validations/index'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import Papa from 'papaparse'

// Helper function to generate CSV
function generateCsv(requests: RequestType[]): string {
  const data = requests.map(req => {
    // Ensure completedTasks is an array and stringify it
    let completedTasksString = ''
    if (req.completedTasks && Array.isArray(req.completedTasks)) {
      completedTasksString = req.completedTasks.map(task => {
        // Assuming task is an object, you might want to format it
        // e.g., task.title, task.url, task.completedAt
        if (typeof task === 'object' && task !== null) {
          return `${(task as any).title || 'N/A'} (URL: ${(task as any).url || 'N/A'}, Completed: ${(task as any).completedAt || 'N/A'})`;
        }
        return String(task);
      }).join('; '); // Join multiple tasks with a semicolon
    } else if (req.completedTasks) {
      // If it's not an array but some other truthy value, try to stringify it directly
      // This might need adjustment based on the actual structure of completedTasks
      try {
        completedTasksString = JSON.stringify(req.completedTasks);
      } catch (e) {
        completedTasksString = 'Error stringifying tasks';
      }
    }

    return {
      ID: req.id,
      Title: req.title,
      Description: req.description,
      Type: req.type,
      Priority: req.priority,
      Status: req.status,
      'Package Type': req.packageType,
      'Pages Completed': req.pagesCompleted,
      'Blogs Completed': req.blogsCompleted,
      'GBP Posts Completed': req.gbpPostsCompleted,
      'Improvements Completed': req.improvementsCompleted,
      Keywords: Array.isArray(req.keywords) ? (req.keywords as string[]).join(', ') : '',
      'Target URL': req.targetUrl,
      'Target Cities': Array.isArray(req.targetCities) ? (req.targetCities as string[]).join(', ') : '',
      'Target Models': Array.isArray(req.targetModels) ? (req.targetModels as string[]).join(', ') : '',
      'Completed Tasks': completedTasksString,
      'Content URL': req.contentUrl,
      'Page Title': req.pageTitle,
      'Created At': req.createdAt.toISOString(),
      'Updated At': req.updatedAt.toISOString(),
      'Completed At': req.completedAt ? req.completedAt.toISOString() : '',
      'User ID': req.userId,
      'Agency ID': req.agencyId,
    }
  })
  return Papa.unparse(data)
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')
  const status = searchParams.get('status') as RequestStatus | null
  const type = searchParams.get('type')
  const searchQuery = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  try {
    const where: Prisma.RequestWhereInput = {
      userId: authResult.user.id,
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (type && type !== 'all') {
      where.type = type
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        // Assuming targetCities and targetModels are arrays of strings.
        // Adjust if they are structured differently (e.g., array of objects).
        { targetCities: { has: searchQuery } }, // Prisma `has` filter for array contains
        { targetModels: { has: searchQuery } }, // Prisma `has` filter for array contains
      ]
    }

    if (startDateParam) {
      const startDate = new Date(startDateParam)
      if (!isNaN(startDate.getTime())) {
        where.createdAt = { ...where.createdAt, gte: startDate }
      } else {
        return errorResponse('Invalid start date format', 400)
      }
    }
    if (endDateParam) {
      const endDate = new Date(endDateParam)
      if (!isNaN(endDate.getTime())) {
        // Add 1 day to endDate to make it inclusive of the end date
        endDate.setDate(endDate.getDate() + 1)
        where.createdAt = { ...where.createdAt, lt: endDate }
      } else {
        return errorResponse('Invalid end date format', 400)
      }
    }


    const orderBy: Prisma.RequestOrderByWithRelationInput = {}
    if (sortBy === 'createdAt' || sortBy === 'priority' || sortBy === 'status') {
      orderBy[sortBy] = sortOrder as Prisma.SortOrder
    } else {
      orderBy.createdAt = 'desc' // Default sort
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy,
      // Include related tasks if necessary, though `completedTasks` is already on the Request model
      // include: { tasks: true } // Example if tasks were a separate related model
    })

    if (format === 'csv' || request.headers.get('Accept')?.includes('text/csv')) {
      const csvData = generateCsv(requests)
      const filename = `requests_${new Date().toISOString().split('T')[0]}.csv`
      logger.info('CSV export generated successfully', {
        userId: authResult.user.id,
        count: requests.length,
        filters: { status, type, searchQuery, sortBy, sortOrder, startDateParam, endDateParam },
        path: '/api/requests',
        method: 'GET',
        format: 'csv'
      })
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      logger.info('Requests fetched successfully (JSON)', {
        userId: authResult.user.id,
        count: requests.length,
        filters: { status, type, searchQuery, sortBy, sortOrder, startDateParam, endDateParam },
        path: '/api/requests',
        method: 'GET',
        format: 'json'
      })
      return successResponse({ requests })
    }
  } catch (error) {
    logger.error('Error processing GET /api/requests', error, {
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