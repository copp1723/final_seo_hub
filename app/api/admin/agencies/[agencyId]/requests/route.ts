import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { UserRole, RequestStatus, Prisma } from '@prisma/client'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET(request: NextRequest, context: { params: Promise<{ agencyId: string }> }) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  const { agencyId } = await context.params
  const user = authResult.user

  // Security check: users must be SUPER_ADMIN or AGENCY_ADMIN for the specified agency
  if (user.role !== UserRole.SUPER_ADMIN && (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied.You do not have permission to view these requests.', 403)
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const type = searchParams.get('type')
  const searchQuery = searchParams.get('search')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrderParam = searchParams.get('sortOrder') || 'desc'
  const sortOrder = (sortOrderParam === 'asc' || sortOrderParam === 'desc') ? sortOrderParam : 'desc'
  const pageParam = searchParams.get('page') || '1'
  const limitParam = searchParams.get('limit') || '10'

  const page = parseInt(pageParam, 10)
  const limit = parseInt(limitParam, 10)
  const skip = (page - 1) * limit

  try {
    const where: Prisma.requestsWhereInput = {
      agencyId: agencyId, // Filter by the agencyId from the URL path
    }

    if (statusParam && statusParam !== 'all') {
      // Validate against valid RequestStatus values
      const validStatuses = Object.values(RequestStatus)
      if (validStatuses.includes(statusParam as RequestStatus)) {
        where.status = statusParam as RequestStatus
      }
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
        { users: { name: { contains: searchQuery, mode: 'insensitive' } } }, // Search by user name
        { users: { email: { contains: searchQuery, mode: 'insensitive' } } }, // Search by user email
      ]
    }

    const orderBy: Prisma.requestsOrderByWithRelationInput = {}
    if (sortBy === 'createdAt' || sortBy === 'priority' || sortBy === 'status' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder
    } else if (sortBy === 'user') { // Allow sorting by user name
        orderBy.users = { name: sortOrder }
    }
    else {
      orderBy.createdAt = 'desc' // Default sort
    }

    const requests = await prisma.requests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        users: { // Include user details for display
          select: { id: true, name: true, email: true }
        }
      }
    })

    const totalRequests = await prisma.requests.count({ where })

    logger.info(`Agency requests fetched successfully for agency ${agencyId}`, {
      userId: user.id,
      agencyId,
      count: requests.length,
      totalCount: totalRequests,
      filters: { status: statusParam, type, searchQuery, sortBy, sortOrder, page, limit },
      path: `/api/admin/agencies/${agencyId}/requests`,
      method: 'GET'
    })

    return successResponse({
        requests,
        pagination: {
            page,
            limit,
            total: totalRequests,
            totalPages: Math.ceil(totalRequests / limit)
        }
    })
  } catch (error) {
    logger.error(`Error fetching requests for agency ${agencyId}`, error, {
      userId: user.id,
      agencyId,
      path: `/api/admin/agencies/${agencyId}/requests`,
      method: 'GET'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}
