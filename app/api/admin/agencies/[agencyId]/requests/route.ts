import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { UserRole, RequestStatus, Prisma } from '@prisma/client'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: { agencyId: string } }) {
  const authResult = await requireAuth()
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const { agencyId } = params
  const user = authResult.user

  // Security check: User must be SUPER_ADMIN or AGENCY_ADMIN for the specified agency
  if (user.role !== UserRole.SUPER_ADMIN && (user.role !== UserRole.AGENCY_ADMIN || user.agencyId !== agencyId)) {
    return errorResponse('Access denied. You do not have permission to view these requests.', 403)
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
    const where: Prisma.RequestWhereInput = {
      agencyId: agencyId, // Filter by the agencyId from the URL path
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
        { user: { name: { contains: searchQuery, mode: 'insensitive' } } }, // Search by user name
        { user: { email: { contains: searchQuery, mode: 'insensitive' } } }, // Search by user email
      ]
    }

    const orderBy: Prisma.RequestOrderByWithRelationInput = {}
    if (sortBy === 'createdAt' || sortBy === 'priority' || sortBy === 'status' || sortBy === 'updatedAt') {
      orderBy[sortBy] = sortOrder
    } else if (sortBy === 'user') { // Allow sorting by user name
        orderBy.user = { name: sortOrder }
    }
    else {
      orderBy.createdAt = 'desc' // Default sort
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: { // Include user details for display
          select: { id: true, name: true, email: true }
        }
      }
    })

    const totalRequests = await prisma.request.count({ where })

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
