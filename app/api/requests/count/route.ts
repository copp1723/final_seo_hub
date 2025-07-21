import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { Prisma } from '@prisma/client'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const type = searchParams.get('type')

  // Validate required parameters
  if (!userId || !month || !year) {
    return errorResponse('Missing required parameters: userId, month, year', 400)
  }

  const monthNum = parseInt(month)
  const yearNum = parseInt(year)

  // Validate month and year
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return errorResponse('Invalid month.Must be between 1 and 12', 400)
  }
  
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
    return errorResponse('Invalid year', 400)
  }

  try {
    // Create date range for the specified month/year
    const startDate = new Date(yearNum, monthNum - 1, 1) // month is 0-indexed in Date constructor
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999) // Last day of the month

    // Build where clause
    const where: Prisma.requestsWhereInput = {
      userId: userId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Add type filter if provided
    if (type && type !== 'all') {
      where.type = type
    }

    // Count requests matching the criteria
    const count = await prisma.requests.count({
      where
    })

    logger.info('Request count fetched successfully', {
      userId,
      month: monthNum,
      year: yearNum,
      type,
      count,
      dateRange: { startDate, endDate },
      path: '/api/requests/count',
      method: 'GET'
    })

    return successResponse({ count })
  } catch (error) {
    logger.error('Error counting requests', error, {
      userId,
      month: monthNum,
      year: yearNum,
      type,
      path: '/api/requests/count',
      method: 'GET'
    })
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}
