import { NextRequest } from 'next/server'
import { createGetHandler } from '@/lib/api-middleware'
import { successResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { DEFAULTS } from '@/lib/constants'
import { z } from 'zod'

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1')),
  pageSize: z.string().optional().transform(val => parseInt(val || String(DEFAULTS.PAGINATION.PAGE_SIZE))),
  status: z.string().optional(),
  search: z.string().optional()
})

export const GET = createGetHandler(
  async (req, { user }) => {
    const searchParams = req.nextUrl.searchParams
    const query = querySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined
    })

    // Ensure page size is within limits
    const pageSize = Math.min(query.pageSize, DEFAULTS.PAGINATION.MAX_PAGE_SIZE)
    const skip = (query.page - 1) * pageSize

    // Build where clause
    const where: any = { userId: user!.id }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    // Parallel queries for data and count
    const [requests, totalCount] = await Promise.all([
      prisma.requests.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          priority: true,
          packageType: true,
          createdAt: true,
          completedAt: true,
          pagesCompleted: true,
          blogsCompleted: true,
          gbpPostsCompleted: true,
          improvementsCompleted: true
        }
      }),
      prisma.requests.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    return successResponse({
      requests,
      pagination: {
        page: query.page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1
      }
    })
  },
  { rateLimit: 'api' }
)
